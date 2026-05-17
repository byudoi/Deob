-- Deobfuscated via Trace Emulation

-- === String Constants ===
local Constants = { [1] = "ChangeState", [2] = "Z��Y�7�9ƎV�=��", [3] = "gmatch", [4] = "������ �", [5] = ":", [6] = "QwBWUtwdymEy", [7] = "gsub", [8] = "XP3lN09kN3V6ckF", [9] = "Ն��P��", [10] = "__len", [11] = "", [12] = "floor", [13] = "math", [14] = "char", [15] = "setmetatable", [16] = "�G��AE��", [17] = "concat", [18] = "8IEHoqp2CthJm", [19] = "FindFirstChildOfClass", [20] = "__metatable", [21] = "Tamper Detected!", [22] = "table", [23] = "unpack", [24] = "byte", [25] = "OI7OwNSzxGnJ", [26] = "e297fPVofWGaQN", [27] = "oncgrxQM2n1OHB", [28] = "l2", [29] = "game", [30] = "__gc", [31] = "���DȐx���", [32] = "__index", [33] = "YetvBVx8NIas", [34] = "MZGML6FAKO70d", [35] = "pcall", [36] = "Connect", [37] = "len", [38] = "random", [39] = "gNMXRz8FN6akA", [40] = "fvFrge4BLKBf", [41] = "string", [42] = "Zg23y7RdyySz5", [43] = "l1", [44] = "bXwqP7s1URoj", [45] = "SIRZC6b6cdWWDR", [46] = "6FWyG9dVI8qKj8", [47] = "remove", [48] = "error", [49] = "tonumber", [50] = "aEEyyrBF0B1XK9", [51] = "GetService", [52] = "g������", [53] = ":(%d*):", [54] = "y�5Ȅ��", [55] = "tostring", [56] = "BA96B5XNr4vS15", }

local UserInputService = game:GetService("UserInputService")
UserInputService.JumpRequest:Connect(function(...)
    local humanoid = game.Players.LocalPlayer.Character:FindFirstChildOfClass("Humanoid")
    humanoid:ChangeState("Jumping")
end)