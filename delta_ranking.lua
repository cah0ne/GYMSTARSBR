local HttpService = game:GetService("HttpService")
local TweenService = game:GetService("TweenService")
local CoreGui = game:GetService("CoreGui")
local UserInputService = game:GetService("UserInputService")

-- CONFIGURAÇÃO DA API LOCAL/PRODUÇÃO --
-- ALERTA: Caso seu app esteja implantado em uma URL pública (ex: https://gymstars.seudominio.com), altere o valor abaixo.
local appUrl = "http://localhost:3000" 

local req = (syn and syn.request) or (http and http.request) or http_request or (fluxus and fluxus.request) or request
if not req then
    warn("Seu Executor/Delta não suporta requisições HTTP!")
    return
end

-- Limpa overlay antigo
local oldCore = CoreGui:FindFirstChild("GymRankingOverlay")
if oldCore then oldCore:Destroy() end

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "GymRankingOverlay"
screenGui.ResetOnSpawn = false
pcall(function() screenGui.Parent = CoreGui end)
if not screenGui.Parent then screenGui.Parent = game.Players.LocalPlayer:WaitForChild("PlayerGui") end

-- Sistema de Save de Configurações
local configFileName = "gym_ranking_config.json"
local config = { Scale = 1, PosX = 0.5, PosY = 0.5, OffsetX = 0, OffsetY = 0 }

if isfile and readfile and writefile then
    if isfile(configFileName) then
        local s, r = pcall(function() return HttpService:JSONDecode(readfile(configFileName)) end)
        if s and type(r) == "table" then config = r end
    end
end
local function saveConfig()
    if writefile then pcall(function() writefile(configFileName, HttpService:JSONEncode(config)) end) end
end

-- Lógica Reutilizável de Arrastar
local function makeDraggable(gui, isRankingRoot)
    local dragging = false
    local dragInput, mousePos, framePos

    gui.InputBegan:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
            dragging = true
            mousePos = input.Position
            framePos = gui.Position
            
            input.Changed:Connect(function()
                if input.UserInputState == Enum.UserInputState.End then
                    dragging = false
                    if isRankingRoot then
                        config.PosX = gui.Position.X.Scale
                        config.PosY = gui.Position.Y.Scale
                        config.OffsetX = gui.Position.X.Offset
                        config.OffsetY = gui.Position.Y.Offset
                        saveConfig()
                    end
                end
            end)
        end
    end)

    gui.InputChanged:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch then
            dragInput = input
        end
    end)

    UserInputService.InputChanged:Connect(function(input)
        if input == dragInput and dragging then
            local delta = input.Position - mousePos
            local scaleMultiplier = isRankingRoot and config.Scale or 1
            local newXOffset = framePos.X.Offset + (delta.X / scaleMultiplier)
            local newYOffset = framePos.Y.Offset + (delta.Y / scaleMultiplier)
            gui.Position = UDim2.new(framePos.X.Scale, newXOffset, framePos.Y.Scale, newYOffset)
        end
    end)
end

-- ========================================== --
-- PAINEL DE CONTROLE (MENU PEQUENO)
-- ========================================== --
local ControlPanel = Instance.new("Frame")
ControlPanel.Size = UDim2.new(0, 250, 0, 230)
ControlPanel.Position = UDim2.new(0, 20, 0, 20)
ControlPanel.BackgroundColor3 = Color3.fromRGB(20, 20, 25)
ControlPanel.BorderSizePixel = 0
ControlPanel.Active = true
ControlPanel.Parent = screenGui
makeDraggable(ControlPanel, false)

local TitleControl = Instance.new("TextLabel", ControlPanel)
TitleControl.Size = UDim2.new(1, 0, 0, 30)
TitleControl.BackgroundColor3 = Color3.fromRGB(15, 15, 20)
TitleControl.TextColor3 = Color3.new(1, 1, 1)
TitleControl.Text = "  PAINEL DO RANKING"
TitleControl.Font = Enum.Font.SourceSansBold
TitleControl.TextSize = 16
TitleControl.TextXAlignment = Enum.TextXAlignment.Left

local CompLabel = Instance.new("TextLabel", ControlPanel)
CompLabel.Size = UDim2.new(1, -20, 0, 20)
CompLabel.Position = UDim2.new(0, 10, 0, 35)
CompLabel.BackgroundTransparency = 1
CompLabel.TextColor3 = Color3.new(0.8, 0.8, 0.8)
CompLabel.Text = "Competição Ao Vivo:"
CompLabel.Font = Enum.Font.SourceSans
CompLabel.TextSize = 14
CompLabel.TextXAlignment = Enum.TextXAlignment.Left

local CompContainer = Instance.new("Frame", ControlPanel)
CompContainer.Size = UDim2.new(1, -20, 0, 30)
CompContainer.Position = UDim2.new(0, 10, 0, 55)
CompContainer.BackgroundColor3 = Color3.fromRGB(40, 40, 45)
CompContainer.BorderSizePixel = 0

local BtnPrev = Instance.new("TextButton", CompContainer)
BtnPrev.Size = UDim2.new(0, 30, 1, 0)
BtnPrev.Text = "<"
BtnPrev.BackgroundColor3 = Color3.fromRGB(50, 50, 55)
BtnPrev.TextColor3 = Color3.new(1,1,1)

local BtnNext = Instance.new("TextButton", CompContainer)
BtnNext.Size = UDim2.new(0, 30, 1, 0)
BtnNext.Position = UDim2.new(1, -30, 0, 0)
BtnNext.Text = ">"
BtnNext.BackgroundColor3 = Color3.fromRGB(50, 50, 55)
BtnNext.TextColor3 = Color3.new(1,1,1)

local CompNameLabel = Instance.new("TextLabel", CompContainer)
CompNameLabel.Size = UDim2.new(1, -60, 1, 0)
CompNameLabel.Position = UDim2.new(0, 30, 0, 0)
CompNameLabel.BackgroundTransparency = 1
CompNameLabel.TextColor3 = Color3.new(1, 1, 1)
CompNameLabel.Text = "Buscando..."
CompNameLabel.TextScaled = true

-- Teclado de Categorias
local CatGrid = Instance.new("Frame", ControlPanel)
CatGrid.Size = UDim2.new(1, -20, 0, 70)
CatGrid.Position = UDim2.new(0, 10, 0, 95)
CatGrid.BackgroundTransparency = 1

local GridLayout = Instance.new("UIGridLayout", CatGrid)
GridLayout.CellSize = UDim2.new(0.31, 0, 0, 30)
GridLayout.CellPadding = UDim2.new(0.035, 0, 0, 10)

local categories = {"AA", "TF", "VT", "UB", "BB", "FX"}
local catButtons = {}
for _, cat in ipairs(categories) do
    local b = Instance.new("TextButton", CatGrid)
    b.Text = cat
    b.BackgroundColor3 = Color3.fromRGB(50, 50, 60)
    b.TextColor3 = Color3.new(1,1,1)
    b.Font = Enum.Font.SourceSansBold
    b.TextSize = 16
    catButtons[cat] = b
end

local BtnMinus = Instance.new("TextButton", ControlPanel)
BtnMinus.Size = UDim2.new(0, 30, 0, 30)
BtnMinus.Position = UDim2.new(0, 10, 0, 185)
BtnMinus.Text = "-"
BtnMinus.BackgroundColor3 = Color3.fromRGB(50, 50, 55)
BtnMinus.TextColor3 = Color3.new(1,1,1)

local BtnPlus = Instance.new("TextButton", ControlPanel)
BtnPlus.Size = UDim2.new(0, 30, 0, 30)
BtnPlus.Position = UDim2.new(0, 45, 0, 185)
BtnPlus.Text = "+"
BtnPlus.BackgroundColor3 = Color3.fromRGB(50, 50, 55)
BtnPlus.TextColor3 = Color3.new(1,1,1)

local BtnToggleView = Instance.new("TextButton", ControlPanel)
BtnToggleView.Size = UDim2.new(1, -95, 0, 30)
BtnToggleView.Position = UDim2.new(0, 85, 0, 185)
BtnToggleView.Text = "OCULTAR RANKING"
BtnToggleView.BackgroundColor3 = Color3.fromRGB(200, 50, 50)
BtnToggleView.TextColor3 = Color3.new(1,1,1)
BtnToggleView.Font = Enum.Font.SourceSansBold
BtnToggleView.TextSize = 12

-- ========================================== --
-- INTERFACE DO RANKING (O OVERLAY GIGANTE)
-- ========================================== --
local MainBoard = Instance.new("CanvasGroup", screenGui)
MainBoard.Size = UDim2.new(0, 800, 0, 600)
MainBoard.AnchorPoint = Vector2.new(0.5, 0.5)
MainBoard.Position = UDim2.new(config.PosX, config.OffsetX, config.PosY, config.OffsetY)
MainBoard.BackgroundTransparency = 1
MainBoard.Active = true
MainBoard.Visible = false
makeDraggable(MainBoard, true)

local bScale = Instance.new("UIScale", MainBoard)
bScale.Scale = config.Scale

BtnMinus.MouseButton1Click:Connect(function()
    config.Scale = math.max(0.3, config.Scale - 0.05)
    bScale.Scale = config.Scale
    saveConfig()
end)

BtnPlus.MouseButton1Click:Connect(function()
    config.Scale = math.min(2.0, config.Scale + 0.05)
    bScale.Scale = config.Scale
    saveConfig()
end)

local isRankingVisible = false
BtnToggleView.MouseButton1Click:Connect(function()
    isRankingVisible = not isRankingVisible
    MainBoard.Visible = isRankingVisible
    BtnToggleView.Text = isRankingVisible and "OCULTAR RANKING" or "MOSTRAR RANKING"
    BtnToggleView.BackgroundColor3 = isRankingVisible and Color3.fromRGB(200, 50, 50) or Color3.fromRGB(50, 150, 80)
end)

-- Header 1: ARTISTIC GYMNASTICS / GYMSTARS BRASIL
local Header1 = Instance.new("Frame", MainBoard)
Header1.Size = UDim2.new(1, 0, 0, 35)
Header1.BackgroundColor3 = Color3.fromRGB(15, 60, 75)
Header1.BorderSizePixel = 0

local H1text1 = Instance.new("TextLabel", Header1)
H1text1.Size = UDim2.new(0, 300, 1, 0)
H1text1.Position = UDim2.new(0, 20, 0, 0)
H1text1.BackgroundTransparency = 1
H1text1.Text = "ARTISTIC GYMNASTICS"
H1text1.TextColor3 = Color3.fromRGB(200, 240, 255)
H1text1.TextXAlignment = Enum.TextXAlignment.Left
H1text1.Font = Enum.Font.SourceSans
H1text1.TextSize = 16

local H1text2 = Instance.new("TextLabel", Header1)
H1text2.Size = UDim2.new(0, 200, 1, 0)
H1text2.Position = UDim2.new(1, -220, 0, 0)
H1text2.BackgroundTransparency = 1
H1text2.Text = "GYMSTARS BRASIL"
H1text2.TextColor3 = Color3.fromRGB(200, 240, 255)
H1text2.TextXAlignment = Enum.TextXAlignment.Right
H1text2.Font = Enum.Font.SourceSans
H1text2.TextSize = 18

-- Header 2: Title (Dark Blue)
local Header2 = Instance.new("Frame", MainBoard)
Header2.Size = UDim2.new(1, 0, 0, 60)
Header2.Position = UDim2.new(0, 0, 0, 35)
Header2.BackgroundColor3 = Color3.fromRGB(7, 20, 45)
Header2.BorderSizePixel = 0

local CategoryTitle = Instance.new("TextLabel", Header2)
CategoryTitle.Size = UDim2.new(1, -90, 1, 0)
CategoryTitle.Position = UDim2.new(0, 80, 0, 0)
CategoryTitle.BackgroundTransparency = 1
CategoryTitle.Text = "Results Floor Exercise"
CategoryTitle.TextColor3 = Color3.new(1, 1, 1)
CategoryTitle.TextXAlignment = Enum.TextXAlignment.Left
CategoryTitle.Font = Enum.Font.SourceSans
CategoryTitle.TextSize = 34

-- Header 3: RESULT - FINAL
local Header3 = Instance.new("Frame", MainBoard)
Header3.Size = UDim2.new(1, 0, 0, 25)
Header3.Position = UDim2.new(0, 0, 0, 95)
Header3.BackgroundColor3 = Color3.fromRGB(20, 100, 110)
Header3.BorderSizePixel = 0

local H3text = Instance.new("TextLabel", Header3)
H3text.Size = UDim2.new(1, -20, 1, 0)
H3text.Position = UDim2.new(0, 80, 0, 0)
H3text.BackgroundTransparency = 1
H3text.Text = "RESULT - FINAL"
H3text.TextColor3 = Color3.new(1, 1, 1)
H3text.TextXAlignment = Enum.TextXAlignment.Left
H3text.Font = Enum.Font.SourceSans
H3text.TextSize = 14

-- Tabela de Rankings
local ListFrame = Instance.new("ScrollingFrame", MainBoard)
ListFrame.Size = UDim2.new(1, 0, 1, -120)
ListFrame.Position = UDim2.new(0, 0, 0, 120)
ListFrame.BackgroundTransparency = 1
ListFrame.BorderSizePixel = 0
ListFrame.ScrollBarThickness = 4
ListFrame.CanvasSize = UDim2.new(0, 0, 0, 0)

local ListLayout = Instance.new("UIListLayout", ListFrame)
ListLayout.SortOrder = Enum.SortOrder.LayoutOrder
ListLayout.Padding = UDim.new(0, 2)

-- Criar a linha igual ao design
local function createRow(rank, teamName, emoji, name, score, order)
    local row = Instance.new("Frame")
    row.Size = UDim2.new(1, 0, 0, 36)
    row.BackgroundColor3 = Color3.fromRGB(150, 200, 200)
    row.BackgroundTransparency = 0.3
    row.BorderSizePixel = 0
    row.LayoutOrder = order

    local RankBox = Instance.new("TextLabel", row)
    RankBox.Size = UDim2.new(0, 45, 1, 0)
    RankBox.BackgroundColor3 = Color3.fromRGB(255, 175, 20)
    RankBox.BorderSizePixel = 0
    RankBox.Text = tostring(rank)
    RankBox.TextColor3 = Color3.new(0, 0, 0)
    RankBox.Font = Enum.Font.SourceSansBold
    RankBox.TextSize = 20

    -- Equipe (Nome Inteiro Sem Corte)
    local CountryTxt = Instance.new("TextLabel", row)
    CountryTxt.Size = UDim2.new(0, 170, 1, 0)
    CountryTxt.Position = UDim2.new(0, 50, 0, 0)
    CountryTxt.BackgroundTransparency = 1
    CountryTxt.Text = teamName:upper()
    CountryTxt.TextColor3 = Color3.new(0, 0, 0)
    CountryTxt.Font = Enum.Font.SourceSansBold
    CountryTxt.TextSize = 18
    CountryTxt.TextXAlignment = Enum.TextXAlignment.Left
    CountryTxt.TextTruncate = Enum.TextTruncate.AtEnd

    -- Emoji (Bandeira ou ícone da equipe salvo)
    local EmojiTxt = Instance.new("TextLabel", row)
    EmojiTxt.Size = UDim2.new(0, 30, 1, 0)
    EmojiTxt.Position = UDim2.new(0, 225, 0, 0)
    EmojiTxt.BackgroundTransparency = 1
    EmojiTxt.Text = emoji
    EmojiTxt.TextSize = 18

    -- Nome da Ginasta
    local NameTxt = Instance.new("TextLabel", row)
    NameTxt.Size = UDim2.new(1, -365, 1, 0)
    NameTxt.Position = UDim2.new(0, 260, 0, 0)
    NameTxt.BackgroundTransparency = 1
    NameTxt.Text = name:upper()
    NameTxt.TextColor3 = Color3.new(0, 0, 0)
    NameTxt.Font = Enum.Font.SourceSans
    NameTxt.TextSize = 20
    NameTxt.TextXAlignment = Enum.TextXAlignment.Left
    NameTxt.TextTruncate = Enum.TextTruncate.AtEnd

    local ScoreTxt = Instance.new("TextLabel", row)
    ScoreTxt.Size = UDim2.new(0, 100, 1, 0)
    ScoreTxt.Position = UDim2.new(1, -110, 0, 0)
    ScoreTxt.BackgroundTransparency = 1
    ScoreTxt.Text = string.format("%.3f", score)
    ScoreTxt.TextColor3 = Color3.new(0, 0, 0)
    ScoreTxt.Font = Enum.Font.SourceSansBold
    ScoreTxt.TextSize = 20
    ScoreTxt.TextXAlignment = Enum.TextXAlignment.Right

    return row
end

-- ========================================== --
-- LÓGICA DE DADOS E APIS --
-- ========================================== --
local state = {
    competitions = {},
    compIndex = 1,
    selectedCat = nil,
    teamCache = {}
}

local categoryTitles = {
    VT = "Results Vault",
    UB = "Results Uneven Bars",
    BB = "Results Balance Beam",
    FX = "Results Floor Exercise",
    AA = "Results Individual All-Around",
    TF = "Results Team Final"
}

-- Busca as Equipes (Para Emojis)
task.spawn(function()
    local url = appUrl .. "/api/app_content?type=team"
    local s, r = pcall(function() return req({Url = url, Method = "GET"}) end)
    if s and r.StatusCode == 200 then
        local data = HttpService:JSONDecode(r.Body)
        for _, row in ipairs(data) do
            state.teamCache[row.title] = row.emoji or "🏳️"
        end
    end
end)

-- Busca as Competições Ativas
local function fetchCompetitions()
    local url = appUrl .. "/api/competitions"
    local s, r = pcall(function() return req({Url = url, Method = "GET"}) end)
    if s and r.StatusCode == 200 then
        state.competitions = HttpService:JSONDecode(r.Body)
        if #state.competitions > 0 then
            CompNameLabel.Text = state.competitions[1].name
            state.compIndex = 1
        else
            CompNameLabel.Text = "Nenhuma encontrada"
        end
    end
end

BtnPrev.MouseButton1Click:Connect(function()
    if #state.competitions == 0 then return end
    state.compIndex = state.compIndex - 1
    if state.compIndex < 1 then state.compIndex = #state.competitions end
    CompNameLabel.Text = state.competitions[state.compIndex].name
end)

BtnNext.MouseButton1Click:Connect(function()
    if #state.competitions == 0 then return end
    state.compIndex = state.compIndex + 1
    if state.compIndex > #state.competitions then state.compIndex = 1 end
    CompNameLabel.Text = state.competitions[state.compIndex].name
end)

-- Configura os botões de Ranking AA, FX...
local updateRanking -- declara pra usar dentro
for cat, btn in pairs(catButtons) do
    btn.MouseButton1Click:Connect(function()
        for _, b in pairs(catButtons) do b.BackgroundColor3 = Color3.fromRGB(50, 50, 60) end
        btn.BackgroundColor3 = Color3.fromRGB(50, 150, 80)
        state.selectedCat = cat
        CategoryTitle.Text = categoryTitles[cat] or cat
        
        if not isRankingVisible then
            isRankingVisible = true
            MainBoard.Visible = true
            BtnToggleView.Text = "OCULTAR RANKING"
            BtnToggleView.BackgroundColor3 = Color3.fromRGB(200, 50, 50)
        end
        updateRanking()
    end)
end

-- Cálculo Matematico do Ranking (Identico ao seu site)
local function calculateRanking(scores, category)
    local sorted = {}
    if category == "AA" then
        local map = {}
        for _, s in ipairs(scores) do
            local gId = s.gymnastId
            if not map[gId] then
                map[gId] = { gymnastName = s.gymnastName, team = s.team or "IND", finalScore = 0, cats = {} }
            end
            if not map[gId].cats[s.category] or s.finalScore > map[gId].cats[s.category] then
                map[gId].cats[s.category] = s.finalScore
            end
        end
        for _, user in pairs(map) do
            local total = 0
            for _, val in pairs(user.cats) do total = total + val end
            user.finalScore = total
            table.insert(sorted, user)
        end
    elseif category == "TF" then
        local map = {}
        for _, s in ipairs(scores) do
            local t = s.team
            if t and t ~= "Independente" and t ~= "IND" then
                if not map[t] then
                    map[t] = { team = t, gymnastName = "", finalScore = 0, app = {VT={}, UB={}, BB={}, FX={}} }
                end
                if s.category and map[t].app[s.category] then
                    table.insert(map[t].app[s.category], s.finalScore)
                end
            end
        end
        for _, tData in pairs(map) do
            local total = 0
            for app, appScores in pairs(tData.app) do
                table.sort(appScores, function(a, b) return a > b end)
                local appTotal = 0
                for i = 1, math.min(3, #appScores) do appTotal = appTotal + appScores[i] end
                total = total + appTotal
            end
            tData.finalScore = total
            table.insert(sorted, tData)
        end
    else
        for _, s in ipairs(scores) do
            if s.category == category then
                table.insert(sorted, s)
            end
        end
    end
    table.sort(sorted, function(a, b) return a.finalScore > b.finalScore end)
    return sorted
end

-- Refresh da Lista
function updateRanking()
    if not state.selectedCat or #state.competitions == 0 then return end
    
    local compId = state.competitions[state.compIndex].id
    local url = appUrl .. "/api/scores?competitionId=" .. compId
    
    local s, r = pcall(function() return req({Url = url, Method = "GET"}) end)
    
    if s and r.StatusCode == 200 then
        local scores = HttpService:JSONDecode(r.Body)
        local ranked = calculateRanking(scores, state.selectedCat)
        
        -- Limpa lista e repopula
        for _, child in ipairs(ListFrame:GetChildren()) do
            if child:IsA("Frame") then child:Destroy() end
        end
        
        for i, item in ipairs(ranked) do
            local teamStr = item.team or "IND"
            local emoji = state.teamCache[teamStr] or "🏳️"
            
            if teamStr == "IND" or teamStr == "Independente" then 
                teamStr = "IND"
                emoji = "🏳️" 
            end
            
            local gymName = item.gymnastName or ""
            if categoryTitles[state.selectedCat] == "Results Team Final" then gymName = "" end
            
            local row = createRow(i, teamStr, emoji, gymName, item.finalScore, i)
            row.Parent = ListFrame
        end
        ListFrame.CanvasSize = UDim2.new(0, 0, 0, #ranked * 38)
    end
end

-- Loop de Polling em background para ao Vivo
task.spawn(function()
    fetchCompetitions()
    while true do
        task.wait(5)
        if isRankingVisible then
            updateRanking()
        end
    end
end)
