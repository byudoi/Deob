-- Deobfuscated via Trace Emulation

-- === String Constants ===
local Constants = { [1] = "8ptu", [2] = "3�o%���k`d", [3] = "game", [4] = "setmetatable", [5] = "error", [6] = "string", [7] = "��k�'�	Q", [8] = "gsub", [9] = "h2VUafVwDOLaD2", [10] = "l94phBqoeuChM", [11] = "", [12] = "�$", [13] = "remove", [14] = "__metatable", [15] = "1pFZN7WlcQcGyp", [16] = "\
2��$���", [17] = "pemtgEMeklQj2", [18] = "random", [19] = "GetMouse", [20] = "byte", [21] = "JFiKTkis3YQiGU", [22] = "char", [23] = "Enum", [24] = "I������", [25] = "l2", [26] = "table", [27] = "__gc", [28] = "math", [29] = "NcOEH9Dxh", [30] = "Connect", [31] = "pCFb6nvtrGe8", [32] = "tonumber", [33] = ":(%d*):", [34] = "__len", [35] = "len", [36] = "R�_��F", [37] = "MoveTo", [38] = "EK6mMQ0IGZ2ZL", [39] = "pcall", [40] = "MsnLGhEELNmfAW", [41] = "NRb0P0YNokWYd1", [42] = "unpack", [43] = "Tamper Detected!", [44] = "oYPKgXzy0s6aAF", [45] = "tostring", [46] = " �z�$!�X�2�9�Su", [47] = "gmatch", [48] = "floor", [49] = ":", [50] = "E", [51] = "GetService", [52] = "__index", [53] = "IsKeyDown", [54] = "q4zNg2k414gu", [55] = "9�S�ӣ}���", [56] = "Dhksy6Tt4CU6gH4", [57] = "concat", [58] = "l1", [59] = "Y48QbwxpOhbgpC", [60] = "ezHNNBIagq2amK", }

local mouse = game.Players.LocalPlayer:GetMouse()
local UserInputService = game:GetService("UserInputService")
mouse.Button1Down:Connect(function(...)
    local isKeyDown = UserInputService:IsKeyDown(Enum.KeyCode.LeftControl)
    game.Players.LocalPlayer.Character:MoveTo(mouse.Hit.p)
end)