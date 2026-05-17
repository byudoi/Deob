-- Deobfuscated via Trace Emulation

-- === String Constants ===
local Constants = { [1] = "floor", [2] = "setmetatable", [3] = "l1", [4] = "IsA", [5] = "len", [6] = "gsub", [7] = "math", [8] = "", [9] = ":", [10] = "unpack", [11] = "orAnLk", [12] = "OX", [13] = "sWMW", [14] = "q9wP3Xo8VCBOs", [15] = "random", [16] = "�e�^���_", [17] = "pcall", [18] = "FEqX8n4eHCh5Q", [19] = "'TK�$�+<�", [20] = "QD4uboqNv7WXPl", [21] = "tonumber", [22] = "Tr24Z��^", [23] = "99DwLTuWkf46", [24] = "GetDescendants", [25] = "\000Vv΂̻2�", [26] = "concat", [27] = "a0ZDNaqaztCLV", [28] = "GetService", [29] = "CYY9MtoBeCMXh7", [30] = "��\r\000_", [31] = ":(%d*):", [32] = "__index", [33] = "FbF28R0c5ccRQc", [34] = "__metatable", [35] = "�:��M���", [36] = "Tamper Detected!", [37] = "9xeCyCu", [38] = "m��V,��", [39] = "eF1Cm3EhE4vE", [40] = "byte", [41] = "__gc", [42] = "char", [43] = "tostring", [44] = "remove", [45] = "�H�C���0", [46] = "string", [47] = "6�����Gx�^�", [48] = "VuEGUyIFRJFkeA", [49] = "uL0mUGTmiYnot", [50] = "l2", [51] = "pyR4y7jIykll4", [52] = "AWi0mEesIBljCy", [53] = "Connect", [54] = "table", [55] = "gmatch", [56] = "__len", [57] = "error", [58] = "game", [59] = "pairs", }

local RunService = game:GetService("RunService")
RunService.Stepped:Connect(function(...)
    local descendants = game.Players.LocalPlayer.Character:GetDescendants()
    local isA = v1:IsA("BasePart")
    v1.CanCollide = false
    v1.Transparency = 0.5
end)