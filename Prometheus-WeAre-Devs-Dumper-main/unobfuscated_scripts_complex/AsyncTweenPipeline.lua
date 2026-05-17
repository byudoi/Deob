local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")

local playerGui = Players.LocalPlayer:WaitForChild("PlayerGui")

local screen = Instance.new("ScreenGui")
screen.Name = "PipelineDemo"
screen.ResetOnSpawn = false
screen.IgnoreGuiInset = true
screen.Parent = playerGui

local root = Instance.new("Frame")
root.Size = UDim2.fromOffset(360, 170)
root.Position = UDim2.new(0.5, -180, 0.9, -180)
root.BackgroundColor3 = Color3.fromRGB(24, 24, 28)
root.BorderSizePixel = 0
root.Parent = screen
local corner = Instance.new("UICorner", root)
corner.CornerRadius = UDim.new(0, 10)

local status = Instance.new("TextLabel")
status.Size = UDim2.fromScale(1, 0.4)
status.BackgroundTransparency = 1
status.Font = Enum.Font.GothamSemibold
status.TextSize = 16
status.TextColor3 = Color3.fromRGB(245, 245, 245)
status.TextXAlignment = Enum.TextXAlignment.Left
status.Text = "Pipeline: idle"
status.Parent = root

local bar = Instance.new("Frame")
bar.Position = UDim2.new(0.05, 0, 0.55, 0)
bar.Size = UDim2.new(0.9, 0, 0.15, 0)
bar.BackgroundColor3 = Color3.fromRGB(50, 50, 66)
bar.BorderSizePixel = 0
bar.Parent = root
Instance.new("UICorner", bar).CornerRadius = UDim.new(0, 6)

local fill = Instance.new("Frame")
fill.BackgroundColor3 = Color3.fromRGB(85, 160, 95)
fill.Size = UDim2.new(0, 0, 1, 0)
fill.BorderSizePixel = 0
fill.Parent = bar
Instance.new("UICorner", fill).CornerRadius = UDim.new(0, 6)

local queueLabel = Instance.new("TextLabel")
queueLabel.Position = UDim2.new(0.05, 0, 0.75, 0)
queueLabel.Size = UDim2.fromScale(0.9, 0.2)
queueLabel.BackgroundTransparency = 1
queueLabel.Font = Enum.Font.Gotham
queueLabel.TextSize = 13
queueLabel.TextXAlignment = Enum.TextXAlignment.Left
queueLabel.TextColor3 = Color3.fromRGB(180, 180, 190)
queueLabel.Text = "Queue: 0, complete: 0, dropped: 0"
queueLabel.Parent = root

local queue = {}
local running = true
local completed = 0
local dropped = 0
local pipelineTick = 0

local function enqueue(label, priority, fn)
	table.insert(queue, {
		id = #queue + 1,
		label = label,
		priority = priority or 1,
		fn = fn,
	})
	table.sort(queue, function(a, b)
		return a.priority > b.priority
	end)
end

local function pipelineWorker()
	while running do
		if #queue == 0 then
			status.Text = "Pipeline: waiting for jobs"
			task.wait(0.1)
		else
			local job = table.remove(queue, 1)
			local snapshot = {
				id = job.id,
				label = job.label,
				priority = job.priority,
				start = os.clock(),
			}
			status.Text = ("Pipeline: running #%d [%s] p=%d"):format(snapshot.id, snapshot.label, snapshot.priority)

			local ok, err = pcall(function()
				job.fn(snapshot)
				completed += 1
			end)
			if not ok then
				warn("pipeline job failed:", err)
				dropped += 1
			end

			local ratio = math.min(1, completed / math.max(1, completed + dropped))
			fill:TweenSize(UDim2.fromScale(ratio, 1), Enum.EasingDirection.Out, Enum.EasingStyle.Cubic, 0.2, true)
			queueLabel.Text = ("Queue: %d, complete: %d, dropped: %d"):format(#queue, completed, dropped)

			task.wait(0.05)
		end
	end
end

local jitter = 0
RunService.Heartbeat:Connect(function(dt)
	jitter += dt
	if jitter < 0.8 then
		return
	end
	jitter = 0
	if not running then
		return
	end

	pipelineTick += 1
	local p = 1
	if pipelineTick % 5 == 0 then
		p = 3
	elseif pipelineTick % 2 == 0 then
		p = 2
	end

	enqueue("pulse-" .. pipelineTick, p, function(meta)
		task.wait(math.random(2, 12) / 100)
		local colorTarget = (pipelineTick % 2 == 0) and Color3.fromRGB(85, 160, 95) or Color3.fromRGB(105, 120, 180)
		local tw = TweenService:Create(root, TweenInfo.new(0.18, Enum.EasingStyle.Linear), {
			BackgroundColor3 = colorTarget,
		})
		tw:Play()
		tw.Completed:Wait()
		TweenService:Create(root, TweenInfo.new(0.18, Enum.EasingStyle.Linear), {
			BackgroundColor3 = Color3.fromRGB(24, 24, 28),
		}):Play()
		task.wait(0.01)
	end)
end)

task.spawn(pipelineWorker)

local runningToken = true
task.defer(function()
	for i = 1, 14 do
		if not runningToken then
			break
		end
		task.wait(0.35)
		enqueue("timer-" .. i, 1, function(meta)
			status.Text = ("Pipeline job %d done @ %.2fs"):format(meta.id, os.clock())
			task.wait(0.06)
		end)
	end
end)

task.delay(18, function()
	running = false
	status.Text = "Pipeline: stopped"
	_G.__pipelineDisposeComplex = function()
		running = false
		runningToken = false
		if screen then
			screen:Destroy()
		end
	end
end)
