local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local char = player.Character or player.CharacterAdded:Wait()
local hum = char:WaitForChild("Humanoid")
local root = char:WaitForChild("HumanoidRootPart")

local function makeSignal()
	local conns = {}
	return {
		connect = function(_, fn)
			table.insert(conns, fn)
		end,
		fire = function(_, ...)
			for i = #conns, 1, -1 do
				local ok, err = pcall(conns[i], ...)
				if not ok then
					warn("signal error:", err)
				end
			end
		end,
		cleanup = function()
			table.clear(conns)
		end,
	}
end

local State = {}
State.__index = State
function State.new(name, onEnter, onExit)
	return setmetatable({
		Name = name,
		onEnter = onEnter or function() end,
		onExit = onExit or function() end,
		heartbeat = nil,
	}, State)
end

local sm = {
	current = nil,
	states = {},
	transitioned = makeSignal(),
	enabled = false,
}

local transitions = {}

function sm:addState(state)
	self.states[state.Name] = state
end

function sm:transition(toName)
	local target = self.states[toName]
	if not target then
		return
	end
	if self.current == target then
		return
	end
	if self.current then
		self.current:onExit()
	end
	local prev = self.current and self.current.Name or "none"
	self.current = target
	self.current:onEnter()
	self.transitioned:fire(prev, self.current.Name)
end

local function idleEnter()
	hum.WalkSpeed = 16
end
local function sprintEnter()
	hum.WalkSpeed = 24
end
local function jumpEnter()
	hum.Jump = true
end

sm:addState(State.new("Idle", idleEnter, function() end))
sm:addState(State.new("Sprint", sprintEnter, function() end))
sm:addState(State.new("Jump", jumpEnter, function() end))

transitions["Idle"] = {
	["LeftShift"] = "Sprint",
}
transitions["Sprint"] = {
	["LeftShiftRelease"] = "Idle",
}

local function nowState()
	return sm.current and sm.current.Name or "none"
end

sm:transition("Idle")
sm.enabled = true

local heartbeatTask
heartbeatTask = RunService.RenderStepped:Connect(function(dt)
	if not sm.enabled then
		return
	end
	local speed = root.AssemblyLinearVelocity.Magnitude
	if sm.current.Name ~= "Jump" and hum:GetState() == Enum.HumanoidStateType.Freefall then
		sm:transition("Jump")
	elseif sm.current.Name == "Jump" and hum:GetState() == Enum.HumanoidStateType.Running then
		sm:transition(speed > 17 and "Sprint" or "Idle")
	end
end)

local downShift = false
UserInputService.InputBegan:Connect(function(input, gp)
	if gp then return end
	if input.KeyCode == Enum.KeyCode.LeftShift then
		downShift = true
		local state = nowState()
		if transitions[state] and transitions[state]["LeftShift"] then
			sm:transition(transitions[state]["LeftShift"])
		end
	elseif input.KeyCode == Enum.KeyCode.CapsLock then
		sm.enabled = not sm.enabled
	end
end)

UserInputService.InputEnded:Connect(function(input, gp)
	if gp then return end
	if input.KeyCode == Enum.KeyCode.LeftShift then
		downShift = false
		local state = nowState()
		if transitions[state] and transitions[state]["LeftShiftRelease"] then
			sm:transition(transitions[state]["LeftShiftRelease"])
		end
	end
end)

sm.transitioned.connect(sm.transitioned, function(prev, next)
	print(("[FSM] %s -> %s"):format(prev, next))
	if next == "Jump" and prev ~= "Jump" then
		task.delay(0.35, function()
			if sm.current and sm.current.Name == "Jump" then
				sm:transition(downShift and "Sprint" or "Idle")
			end
		end)
	end
end)

local function dispose()
	sm.enabled = false
	sm.transitioned.cleanup()
	if heartbeatTask then
		heartbeatTask:Disconnect()
		heartbeatTask = nil
	end
end

_G.__fsmCleanupComplexStateMachine = dispose
