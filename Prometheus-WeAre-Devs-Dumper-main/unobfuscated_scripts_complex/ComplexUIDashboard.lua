local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local function makeInstance(className, props)
	local obj = Instance.new(className)
	for key, value in pairs(props) do
		obj[key] = value
	end
	return obj
end

local function makeLabel(parent, text, y)
	return makeInstance("TextLabel", {
		Parent = parent,
		BackgroundTransparency = 1,
		Size = UDim2.new(1, -20, 0, 24),
		Position = UDim2.new(0, 10, 0, y),
		Font = Enum.Font.GothamBold,
		TextSize = 14,
		TextColor3 = Color3.fromRGB(220, 220, 220),
		TextXAlignment = Enum.TextXAlignment.Left,
		Text = text,
	})
end

local function buildWindow()
	local screen = makeInstance("ScreenGui", {
		ResetOnSpawn = false,
		ZIndexBehavior = Enum.ZIndexBehavior.Global,
		Name = "ComplexDashboard",
		Parent = playerGui,
	})

	local frame = makeInstance("Frame", {
		Parent = screen,
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.new(0.5, 0, 0.5, 0),
		Size = UDim2.new(0, 340, 0, 290),
		BackgroundColor3 = Color3.fromRGB(28, 28, 32),
		BorderSizePixel = 0,
	})
	makeInstance("UICorner", {CornerRadius = UDim.new(0, 8), Parent = frame})
	local stroke = makeInstance("UIStroke", {
		Parent = frame,
		Thickness = 1,
		Color = Color3.fromRGB(130, 130, 150),
		ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
	})

	local title = makeInstance("TextLabel", {
		Parent = frame,
		Size = UDim2.new(1, 0, 0, 34),
		BackgroundColor3 = Color3.fromRGB(18, 18, 24),
		BorderSizePixel = 0,
		Active = true,
		Text = "Complex UI Stress Script",
		Font = Enum.Font.GothamBlack,
		TextSize = 16,
		TextColor3 = Color3.fromRGB(245, 245, 250),
	})
	makeInstance("UICorner", {Parent = title, CornerRadius = UDim.new(0, 8)})

	local close = makeInstance("TextButton", {
		Parent = title,
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, -10, 0, 4),
		Size = UDim2.new(0, 28, 0, 22),
		Text = "X",
		Font = Enum.Font.GothamBold,
		TextSize = 14,
		BackgroundColor3 = Color3.fromRGB(185, 44, 44),
		TextColor3 = Color3.fromRGB(255, 255, 255),
		BorderSizePixel = 0,
	})
	makeInstance("UICorner", {Parent = close, CornerRadius = UDim.new(0, 6)})

	local body = makeInstance("Frame", {
		Parent = frame,
		Position = UDim2.new(0, 8, 0, 40),
		Size = UDim2.new(1, -16, 1, -48),
		BackgroundTransparency = 1,
	})

	local content = makeInstance("TextLabel", {
		Parent = body,
		Position = UDim2.new(0, 0, 0, 0),
		Size = UDim2.new(1, 0, 1, 0),
		BackgroundTransparency = 1,
		TextXAlignment = Enum.TextXAlignment.Left,
		Font = Enum.Font.Gotham,
		TextSize = 13,
		TextColor3 = Color3.fromRGB(205, 205, 220),
		TextWrapped = true,
	})
	content.Text = "Events: 0\nFPS sample: ...\nStatus: idle"

	local buttonLayout = makeInstance("UIListLayout", {
		Parent = body,
		FillDirection = Enum.FillDirection.Horizontal,
		HorizontalAlignment = Enum.HorizontalAlignment.Left,
		Padding = UDim.new(0, 8),
	})
	buttonLayout.VerticalAlignment = Enum.VerticalAlignment.Bottom
	buttonLayout.HorizontalAlignment = Enum.HorizontalAlignment.Left

	local btn = makeInstance("TextButton", {
		Parent = body,
		Name = "Pulse",
		Size = UDim2.new(0, 120, 0, 28),
		Position = UDim2.new(0, 0, 1, -36),
		Text = "Pulse Update",
		Font = Enum.Font.GothamBold,
		TextSize = 14,
		BackgroundColor3 = Color3.fromRGB(58, 108, 210),
		TextColor3 = Color3.fromRGB(255, 255, 255),
		BorderSizePixel = 0,
	})
	makeInstance("UICorner", {Parent = btn, CornerRadius = UDim.new(0, 6)})

	local function makeStatusRow(labelText, y, value)
		local row = makeInstance("Frame", {
			Parent = body,
			BackgroundTransparency = 1,
			Size = UDim2.new(1, 0, 0, 22),
			Position = UDim2.new(0, 0, 0, y),
		})
		makeLabel(row, labelText, 0)
		local val = makeLabel(row, value, 0)
		val.TextXAlignment = Enum.TextXAlignment.Right
		val.Name = "Value"
		return val
	end

	local fpsValue = makeStatusRow("FPS:", 170, "...")
	local eventValue = makeStatusRow("Events:", 194, "0")

	local state = {
		open = true,
		collapsed = false,
		pulses = 0,
		deltaSamples = {},
		maxSamples = 24,
	}

	local api = {}

	function api:setStatus(text)
		content.Text = text
	end

	function api:addPulse()
		state.pulses += 1
		eventValue.Text = tostring(state.pulses)
		api:setStatus("Events: " .. state.pulses .. "\nStatus: pulsed")
	end

	local function animateSize(targetY)
		local t = TweenService:Create(frame, TweenInfo.new(0.22, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), {
			Size = UDim2.new(0, 340, 0, targetY),
		})
		t:Play()
	end

	close.MouseButton1Click:Connect(function()
		state.open = false
		animateSize(34)
		task.delay(0.24, function()
			if not state.open then
				screen:Destroy()
			end
		end)
	end)

	btn.MouseButton1Click:Connect(function()
		if state.collapsed then
			return
		end
		api:addPulse()
		content.TextColor3 = Color3.fromRGB(180, 230, 190)
		task.delay(0.1, function()
			content.TextColor3 = Color3.fromRGB(205, 205, 220)
		end)
		animateSize(320)
		task.delay(0.25, function()
			animateSize(290)
		end)
	end)

	local dragOffset = nil
	title.InputBegan:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1 then
			dragOffset = Vector2.new(input.Position.X, input.Position.Y) - frame.AbsolutePosition
		end
	end)
	UserInputService.InputChanged:Connect(function(input)
		if dragOffset and input.UserInputType == Enum.UserInputType.MouseMovement then
			frame.Position = UDim2.new(
				0, input.Position.X - dragOffset.X,
				0, input.Position.Y - dragOffset.Y
			)
		end
	end)
	UserInputService.InputEnded:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1 then
			dragOffset = nil
		end
	end)

	local last = os.clock()
	RunService.RenderStepped:Connect(function(dt)
		local now = os.clock()
		local fps = 1 / dt
		table.insert(state.deltaSamples, fps)
		if #state.deltaSamples > state.maxSamples then
			table.remove(state.deltaSamples, 1)
		end
		if #state.deltaSamples >= 2 then
			local sum = 0
			for i = 1, #state.deltaSamples do
				sum += state.deltaSamples[i]
			end
			fpsValue.Text = ("%.1f"):format(sum / #state.deltaSamples)
		end
		if now - last > 0.75 then
			last = now
			local heartbeat = stroke.Thickness
			stroke.Thickness = heartbeat == 1 and 2 or 1
			task.delay(0.2, function()
				stroke.Thickness = heartbeat
			end)
		end
	end)

	task.spawn(function()
		while state.open do
			api:setStatus(
				"Events: " .. state.pulses .. "\n" ..
				("Status: running @ t+%0.1fs"):format(tick() % 1000)
			)
			task.wait(0.9)
		end
	end)

	return api
end

local dashboard = buildWindow()
dashboard:addPulse()
