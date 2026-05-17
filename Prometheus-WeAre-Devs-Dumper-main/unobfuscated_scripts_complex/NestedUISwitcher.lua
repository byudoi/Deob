local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local GuiService = game:GetService("GuiService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local function new(cls, props)
	local o = Instance.new(cls)
	for k, v in pairs(props or {}) do
		o[k] = v
	end
	return o
end

local screen = new("ScreenGui", {
	Name = "NestedUISwitcher",
	ResetOnSpawn = false,
	IgnoreGuiInset = true,
})
screen.Parent = playerGui

local window = new("Frame", {
	Parent = screen,
	Position = UDim2.new(0.05, 0, 0.15, 0),
	Size = UDim2.new(0, 430, 0, 360),
	BackgroundColor3 = Color3.fromRGB(22, 22, 24),
	BorderColor3 = Color3.fromRGB(70, 70, 90),
})
new("UICorner", {Parent = window, CornerRadius = UDim.new(0, 8)})

local title = new("TextLabel", {
	Parent = window,
	Position = UDim2.new(0, 8, 0, 6),
	Size = UDim2.new(1, -16, 0, 22),
	BackgroundTransparency = 1,
	Text = "Nested UI + recursive bind",
	Font = Enum.Font.GothamBold,
	TextSize = 15,
	TextXAlignment = Enum.TextXAlignment.Left,
	TextColor3 = Color3.fromRGB(230, 230, 235),
})

local listRoot = new("ScrollingFrame", {
	Parent = window,
	Position = UDim2.new(0, 8, 0, 34),
	Size = UDim2.new(1, -16, 1, -42),
	CanvasSize = UDim2.new(),
	BackgroundColor3 = Color3.fromRGB(30, 30, 35),
	BorderSizePixel = 0,
	ScrollBarThickness = 6,
})
new("UICorner", {Parent = listRoot, CornerRadius = UDim.new(0, 6)})

local layout = new("UIListLayout", {
	Parent = listRoot,
	SortOrder = Enum.SortOrder.LayoutOrder,
	Padding = UDim.new(0, 7),
})
layout.Padding = UDim.new(0, 7)

local function makeSection(parent, sectionName, depth, maxDepth)
	local section = new("Frame", {
		Parent = parent,
		Name = sectionName,
		Size = UDim2.new(1, -8, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		BackgroundColor3 = Color3.fromRGB(38, 38, 45),
		BorderSizePixel = 0,
	})
	new("UICorner", {Parent = section, CornerRadius = UDim.new(0, 6)})

	local header = new("TextButton", {
		Parent = section,
		Size = UDim2.new(1, 0, 0, 30),
		BackgroundColor3 = Color3.fromRGB(58, 58, 70),
		Text = sectionName .. ("  [depth %d]"):format(depth),
		TextColor3 = Color3.fromRGB(245, 245, 252),
		Font = Enum.Font.GothamBold,
		TextSize = 13,
		BorderSizePixel = 0,
	})
	new("UICorner", {Parent = header, CornerRadius = UDim.new(0, 6)})

	local body = new("Frame", {
		Parent = section,
		Name = "Body",
		Size = UDim2.new(1, 0, 0, 0),
		BackgroundTransparency = 1,
	})

	local inner = new("UIListLayout", {
		Parent = body,
		SortOrder = Enum.SortOrder.LayoutOrder,
		Padding = UDim.new(0, 4),
	})

	for i = 1, 3 do
		local line = new("TextLabel", {
			Parent = body,
			Text = ("Item %d in %s (depth %d)"):format(i, sectionName, depth),
			Size = UDim2.new(1, -12, 0, 20),
			Position = UDim2.new(0, 6, 0, 0),
			BackgroundColor3 = Color3.fromRGB(48, 48, 62),
			BorderSizePixel = 0,
			TextXAlignment = Enum.TextXAlignment.Left,
			TextColor3 = Color3.fromRGB(220, 220, 230),
			Font = Enum.Font.Gotham,
			TextSize = 12,
		})
		new("UICorner", {Parent = line, CornerRadius = UDim.new(0, 4)})
	end

	if depth < maxDepth then
		for s = 1, 2 do
			makeSection(body, sectionName .. ".child" .. s, depth + 1, maxDepth)
		end
	end

	local expanded = true
	local function toggle()
		expanded = not expanded
		body.Visible = expanded
		header.Text = sectionName .. ("  [depth %d] %s"):format(
			depth, expanded and "(-)" or "(+)"
		)
	end
	header.MouseButton1Click:Connect(toggle)
	toggle()
end

for i = 1, 3 do
	makeSection(listRoot, "Group-" .. i, 1, 3)
end

listRoot.CanvasSize = UDim2.new(0, 0, 0, 12)
task.defer(function()
	task.wait(0.05)
	listRoot.CanvasSize = UDim2.new(0, 0, 0, layout.AbsoluteContentSize.Y + 12)
end)

local hint = new("TextLabel", {
	Parent = screen,
	Size = UDim2.new(0, 420, 0, 20),
	Position = UDim2.new(0.5, -210, 1, -24),
	BackgroundTransparency = 1,
	Text = "Press F5 to rebuild bindings; Shift+LeftClick on section headers to toggle.",
	Font = Enum.Font.Gotham,
	TextSize = 12,
	TextColor3 = Color3.fromRGB(190, 190, 205),
})

UserInputService.InputBegan:Connect(function(input, gpe)
	if gpe then
		return
	end
	if input.KeyCode == Enum.KeyCode.F5 then
		listRoot:ClearAllChildren()
		layout = new("UIListLayout", {
			Parent = listRoot,
			SortOrder = Enum.SortOrder.LayoutOrder,
			Padding = UDim.new(0, 7),
		})
		for i = 1, 3 do
			makeSection(listRoot, "Group-" .. i, 1, 3)
		end
		task.defer(function()
			listRoot.CanvasSize = UDim2.new(0, 0, 0, layout.AbsoluteContentSize.Y + 12)
		end)
		hint.Text = "Rebuilt at " .. string.format("%.2f", tick())
	end
end)

GuiService:GetPropertyChangedSignal("TopbarEnabled"):Connect(function()
	if not GuiService.TopbarEnabled then
		screen.Enabled = false
	end
end)
