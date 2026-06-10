-- ========================================== --
-- GYMSTARS BRASIL - DELTA / ROBLOX EXECUTOR
-- BATE-PAPO IN-GAME (SISTEMA DE CHAT MUNDIAL)
-- ========================================== --

local HttpService = game:GetService("HttpService")
local CoreGui = game:GetService("CoreGui")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local Players = game:GetService("Players")

local req = (syn and syn.request) or (http and http.request) or http_request or (fluxus and fluxus.request) or request
if not req then
    warn("[Gymstars] Executor não suporta requisições HTTP!")
    return
end

local WEBGAPI_KEY = "AIzaSyDHNfoZ8qb5QUqO72fAtFH6HFb4TgVitoc"
local PROJECT_ID = "avian-point-s83b3"
local DB_ID = "ai-studio-2416c944-2ca0-4054-aae3-0e3392d7a1a0"
local BASE_REST_URL = "https://firestore.googleapis.com/v1/projects/"..PROJECT_ID.."/databases/"..DB_ID.."/documents"

local CurrentToken = nil
local CurrentUID = nil
local UserData = nil

local ActiveRoomId = nil
local ActiveRoomName = nil
local PollingChat = false
local MsgHistory = {}
local FirstLoad = true

-- ========================================== --
-- FIREBASE API FUNCTIONS
-- ========================================== --

local function login(email, password)
    local url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" .. WEBGAPI_KEY
    local body = HttpService:JSONEncode({
        email = email,
        password = password,
        returnSecureToken = true
    })
    
    local r = pcall(function()
        return req({
            Url = url,
            Method = "POST",
            Headers = {["Content-Type"] = "application/json"},
            Body = body
        })
    end)
    
    local success, result = r
    if type(result) == "table" and result.StatusCode == 200 then
        local data = HttpService:JSONDecode(result.Body)
        CurrentToken = data.idToken
        CurrentUID = data.localId
        return true, "Sucesso"
    else
        return false, result and type(result) == "table" and result.Body or "Erro de requisição. A senha deve ser no mínimo 6 caracteres e o Email válido."
    end
end

local function getUserData()
    local url = BASE_REST_URL .. "/users/" .. CurrentUID
    local s, r = pcall(function()
        return req({
            Url = url,
            Method = "GET",
            Headers = {["Authorization"] = "Bearer " .. CurrentToken}
        })
    end)
    
    if s and r.StatusCode == 200 then
        local data = HttpService:JSONDecode(r.Body)
        local fields = data.fields
        UserData = {
            uid = CurrentUID,
            username = fields.username and fields.username.stringValue or "Desconhecido",
            tag = fields.tag and fields.tag.stringValue or "Ginasta",
        }
        return true
    end
    return false
end

local function fetchRooms()
    local url = BASE_REST_URL .. "/chat_rooms"
    local s, r = pcall(function()
        return req({
            Url = url,
            Method = "GET"
        })
    end)
    
    local rooms = {}
    if s and r.StatusCode == 200 then
        local data = HttpService:JSONDecode(r.Body)
        if data.documents then
            for _, doc in ipairs(data.documents) do
                local roomId = string.match(doc.name, "([^/]+)$")
                local fields = doc.fields or {}
                table.insert(rooms, {
                    id = roomId,
                    name = fields.name and fields.name.stringValue or "Sala sem nome",
                    description = fields.description and fields.description.stringValue or ""
                })
            end
        end
    end
    return rooms
end

local function fetchMessages(roomId)
    local url = BASE_REST_URL .. ":runQuery"
    local queryObj = {
        structuredQuery = {
            from = {{collectionId = "chat_messages"}},
            where = {
                fieldFilter = {
                    field = {fieldPath = "channelId"},
                    op = "EQUAL",
                    value = {stringValue = roomId}
                }
            },
            orderBy = {{field = {fieldPath = "createdAt"}, direction = "DESCENDING"}},
            limit = 50
        }
    }
    
    local s, r = pcall(function()
        return req({
            Url = url,
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json"
            },
            Body = HttpService:JSONEncode(queryObj)
        })
    end)
    
    local msgs = {}
    if s and r.StatusCode == 200 then
        local data = HttpService:JSONDecode(r.Body)
        for _, item in ipairs(data) do
            if item.document then
                local doc = item.document
                local fields = doc.fields or {}
                table.insert(msgs, {
                    id = string.match(doc.name, "([^/]+)$"),
                    text = fields.text and fields.text.stringValue or "",
                    senderName = fields.senderName and fields.senderName.stringValue or "User",
                    senderTag = fields.senderTag and fields.senderTag.stringValue or "User",
                    createdAt = fields.createdAt and tonumber(fields.createdAt.integerValue) or 0
                })
            end
        end
    end
    return msgs
end

local function sendMessage(roomId, text)
    local url = BASE_REST_URL .. "/chat_messages"
    local bodyObj = {
        fields = {
            channelId = {stringValue = roomId},
            senderId = {stringValue = CurrentUID},
            senderName = {stringValue = UserData.username},
            senderTag = {stringValue = UserData.tag},
            text = {stringValue = text},
            createdAt = {integerValue = tostring(math.floor(os.time() * 1000))}
        }
    }
    
    pcall(function()
        req({
            Url = url,
            Method = "POST",
            Headers = {
                ["Authorization"] = "Bearer " .. CurrentToken,
                ["Content-Type"] = "application/json"
            },
            Body = HttpService:JSONEncode(bodyObj)
        })
    end)
end

-- ========================================== --
-- UI CREATION
-- ========================================== --

if CoreGui:FindFirstChild("GymstarsChatApp") then
    CoreGui.GymstarsChatApp:Destroy()
end

local ScreenGui = Instance.new("ScreenGui")
ScreenGui.Name = "GymstarsChatApp"
ScreenGui.ResetOnSpawn = false
ScreenGui.Parent = CoreGui

-- Faz um container Draggable
local function MakeDraggable(topbar, object)
    local dragToggle = nil
    local dragSpeed = 0.1
    local dragInput = nil
    local dragStart = nil
    local dragPos = nil

    local function updateInput(input)
        local delta = input.Position - dragStart
        local position = UDim2.new(dragPos.X.Scale, dragPos.X.Offset + delta.X, dragPos.Y.Scale, dragPos.Y.Offset + delta.Y)
        game:GetService("TweenService"):Create(object, TweenInfo.new(dragSpeed), {Position = position}):Play()
    end

    topbar.InputBegan:Connect(function(input)
        if (input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch) then
            dragToggle = true
            dragStart = input.Position
            dragPos = object.Position
            input.Changed:Connect(function()
                if input.UserInputState == Enum.UserInputState.End then
                    dragToggle = false
                end
            end)
        end
    end)

    topbar.InputChanged:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch then
            dragInput = input
        end
    end)

    UserInputService.InputChanged:Connect(function(input)
        if input == dragInput and dragToggle then
            updateInput(input)
        end
    end)
end

-- Botão Flutuante (Minimizado)
local FloatingBtn = Instance.new("TextButton")
FloatingBtn.Size = UDim2.new(0, 50, 0, 50)
FloatingBtn.Position = UDim2.new(1, -70, 0.5, -25)
FloatingBtn.BackgroundColor3 = Color3.fromRGB(0, 156, 59) -- Verde Gymstars
FloatingBtn.Text = "💬"
FloatingBtn.TextSize = 25
FloatingBtn.Font = Enum.Font.GothamBold
FloatingBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
FloatingBtn.UICorner = Instance.new("UICorner")
FloatingBtn.UICorner.CornerRadius = UDim.new(1, 0)
FloatingBtn.Parent = ScreenGui
FloatingBtn.Visible = false

-- Modal Base (Janela Principal)
local MainFrame = Instance.new("Frame")
MainFrame.Size = UDim2.new(0, 350, 0, 450)
MainFrame.Position = UDim2.new(0.5, -175, 0.5, -225)
MainFrame.BackgroundColor3 = Color3.fromRGB(15, 23, 42) -- Slate-900 (Transparente dps)
MainFrame.BackgroundTransparency = 0.4
MainFrame.BorderSizePixel = 0
MainFrame.ClipsDescendants = true
MainFrame.Parent = ScreenGui

local MainCorner = Instance.new("UICorner")
MainCorner.CornerRadius = UDim.new(0, 10)
MainCorner.Parent = MainFrame

local TopBar = Instance.new("Frame")
TopBar.Size = UDim2.new(1, 0, 0, 40)
TopBar.BackgroundColor3 = Color3.fromRGB(30, 41, 59)
TopBar.BorderSizePixel = 0
TopBar.Parent = MainFrame
MakeDraggable(TopBar, MainFrame)

local Title = Instance.new("TextLabel")
Title.Size = UDim2.new(1, -80, 1, 0)
Title.Position = UDim2.new(0, 10, 0, 0)
Title.BackgroundTransparency = 1
Title.Text = "Gymstars - Acesso"
Title.TextColor3 = Color3.fromRGB(255, 255, 255)
Title.Font = Enum.Font.GothamBold
Title.TextSize = 14
Title.TextXAlignment = Enum.TextXAlignment.Left
Title.Parent = TopBar

local MinBtn = Instance.new("TextButton")
MinBtn.Size = UDim2.new(0, 30, 0, 30)
MinBtn.Position = UDim2.new(1, -70, 0, 5)
MinBtn.BackgroundTransparency = 1
MinBtn.Text = "—"
MinBtn.TextColor3 = Color3.fromRGB(200, 200, 200)
MinBtn.TextSize = 14
MinBtn.Font = Enum.Font.GothamBold
MinBtn.Parent = TopBar

local CloseBtn = Instance.new("TextButton")
CloseBtn.Size = UDim2.new(0, 30, 0, 30)
CloseBtn.Position = UDim2.new(1, -35, 0, 5)
CloseBtn.BackgroundTransparency = 1
CloseBtn.Text = "X"
CloseBtn.TextColor3 = Color3.fromRGB(255, 80, 80)
CloseBtn.TextSize = 14
CloseBtn.Font = Enum.Font.GothamBold
CloseBtn.Parent = TopBar

MinBtn.MouseButton1Click:Connect(function()
    MainFrame.Visible = false
    FloatingBtn.Visible = true
end)

FloatingBtn.MouseButton1Click:Connect(function()
    MainFrame.Visible = true
    FloatingBtn.Visible = false
end)

CloseBtn.MouseButton1Click:Connect(function()
    ScreenGui:Destroy()
end)

local ContentArea = Instance.new("Frame")
ContentArea.Size = UDim2.new(1, 0, 1, -40)
ContentArea.Position = UDim2.new(0, 0, 0, 40)
ContentArea.BackgroundTransparency = 1
ContentArea.Parent = MainFrame

-- ========================================== --
-- LOGIN VIEW
-- ========================================== --
local LoginView = Instance.new("Frame")
LoginView.Size = UDim2.new(1, 0, 1, 0)
LoginView.BackgroundTransparency = 1
LoginView.Parent = ContentArea

local EmailBox = Instance.new("TextBox")
EmailBox.Size = UDim2.new(0.8, 0, 0, 40)
EmailBox.Position = UDim2.new(0.1, 0, 0.2, 0)
EmailBox.BackgroundColor3 = Color3.fromRGB(30, 41, 59)
EmailBox.TextColor3 = Color3.fromRGB(255,255,255)
EmailBox.PlaceholderText = "E-mail"
EmailBox.Font = Enum.Font.Gotham
EmailBox.TextSize = 14
EmailBox.Parent = LoginView
Instance.new("UICorner").Parent = EmailBox

local PassBox = Instance.new("TextBox")
PassBox.Size = UDim2.new(0.8, 0, 0, 40)
PassBox.Position = UDim2.new(0.1, 0, 0.35, 0)
PassBox.BackgroundColor3 = Color3.fromRGB(30, 41, 59)
PassBox.TextColor3 = Color3.fromRGB(255,255,255)
PassBox.PlaceholderText = "Senha"
PassBox.TextWrapped = true
PassBox.ClearTextOnFocus = false
PassBox.Font = Enum.Font.Gotham
PassBox.TextSize = 14
PassBox.Parent = LoginView
Instance.new("UICorner").Parent = PassBox

local LoginBtn = Instance.new("TextButton")
LoginBtn.Size = UDim2.new(0.8, 0, 0, 40)
LoginBtn.Position = UDim2.new(0.1, 0, 0.55, 0)
LoginBtn.BackgroundColor3 = Color3.fromRGB(0, 156, 59)
LoginBtn.TextColor3 = Color3.fromRGB(255,255,255)
LoginBtn.Text = "ENTRAR"
LoginBtn.Font = Enum.Font.GothamBold
LoginBtn.TextSize = 14
LoginBtn.Parent = LoginView
Instance.new("UICorner").Parent = LoginBtn

local LoginStatus = Instance.new("TextLabel")
LoginStatus.Size = UDim2.new(0.8, 0, 0, 30)
LoginStatus.Position = UDim2.new(0.1, 0, 0.7, 0)
LoginStatus.BackgroundTransparency = 1
LoginStatus.TextColor3 = Color3.fromRGB(255, 80, 80)
LoginStatus.Text = ""
LoginStatus.TextWrapped = true
LoginStatus.Font = Enum.Font.Gotham
LoginStatus.TextSize = 12
LoginStatus.Parent = LoginView

-- ========================================== --
-- ROOM LIST VIEW
-- ========================================== --
local RoomListView = Instance.new("Frame")
RoomListView.Size = UDim2.new(1, 0, 1, 0)
RoomListView.BackgroundTransparency = 1
RoomListView.Visible = false
RoomListView.Parent = ContentArea

local RoomScroll = Instance.new("ScrollingFrame")
RoomScroll.Size = UDim2.new(1, 0, 1, -10)
RoomScroll.Position = UDim2.new(0, 0, 0, 5)
RoomScroll.BackgroundTransparency = 1
RoomScroll.ScrollBarThickness = 4
RoomScroll.CanvasSize = UDim2.new(0, 0, 0, 0)
RoomScroll.Parent = RoomListView

local RoomLayout = Instance.new("UIListLayout")
RoomLayout.Padding = UDim.new(0, 10)
RoomLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
RoomLayout.Parent = RoomScroll

local function OpenRoomList()
    Title.Text = "Bate-Papo - Salas ("..UserData.username..")"
    LoginView.Visible = false
    RoomListView.Visible = true
    
    local rooms = fetchRooms()
    for _, child in ipairs(RoomScroll:GetChildren()) do
        if child:IsA("TextButton") then child:Destroy() end
    end
    
    for i, room in ipairs(rooms) do
        local btn = Instance.new("TextButton")
        btn.Size = UDim2.new(0.9, 0, 0, 50)
        btn.BackgroundColor3 = Color3.fromRGB(30, 41, 59)
        btn.Text = "📁 " .. room.name
        btn.TextColor3 = Color3.fromRGB(255, 255, 255)
        btn.Font = Enum.Font.GothamBold
        btn.TextSize = 14
        btn.Parent = RoomScroll
        Instance.new("UICorner").Parent = btn
        
        btn.MouseButton1Click:Connect(function()
            JoinRoom(room.id, room.name)
        end)
    end
    RoomScroll.CanvasSize = UDim2.new(0, 0, 0, #rooms * 60)
end

-- ========================================== --
-- CHAT VIEW
-- ========================================== --
local ChatView = Instance.new("Frame")
ChatView.Size = UDim2.new(1, 0, 1, 0)
ChatView.BackgroundTransparency = 1
ChatView.Visible = false
ChatView.Parent = ContentArea

local BackBtn = Instance.new("TextButton")
BackBtn.Size = UDim2.new(0, 50, 0, 30)
BackBtn.Position = UDim2.new(0, 10, 0, 2)
BackBtn.BackgroundColor3 = Color3.fromRGB(50, 60, 80)
BackBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
BackBtn.Text = "Voltar"
BackBtn.Font = Enum.Font.Gotham
BackBtn.TextSize = 12
Instance.new("UICorner").Parent = BackBtn

local ChatScroll = Instance.new("ScrollingFrame")
ChatScroll.Size = UDim2.new(1, -20, 1, -100)
ChatScroll.Position = UDim2.new(0, 10, 0, 40)
ChatScroll.BackgroundTransparency = 1
ChatScroll.ScrollBarThickness = 4
ChatScroll.CanvasSize = UDim2.new(0, 0, 0, 0)
ChatScroll.Parent = ChatView

local ChatLayout = Instance.new("UIListLayout")
ChatLayout.Padding = UDim.new(0, 8)
ChatLayout.SortOrder = Enum.SortOrder.LayoutOrder
ChatLayout.Parent = ChatScroll

local MsgBox = Instance.new("TextBox")
MsgBox.Size = UDim2.new(0.7, 0, 0, 40)
MsgBox.Position = UDim2.new(0, 10, 1, -50)
MsgBox.BackgroundColor3 = Color3.fromRGB(30, 41, 59)
MsgBox.TextColor3 = Color3.fromRGB(255,255,255)
MsgBox.PlaceholderText = "Mensagem..."
MsgBox.Font = Enum.Font.Gotham
MsgBox.TextSize = 14
MsgBox.Parent = ChatView
Instance.new("UICorner").Parent = MsgBox

local SendBtn = Instance.new("TextButton")
SendBtn.Size = UDim2.new(0.2, 0, 0, 40)
SendBtn.Position = UDim2.new(0.75, 0, 1, -50)
SendBtn.BackgroundColor3 = Color3.fromRGB(0, 156, 59)
SendBtn.TextColor3 = Color3.fromRGB(255,255,255)
SendBtn.Text = "Mandar"
SendBtn.Font = Enum.Font.GothamBold
SendBtn.TextSize = 14
SendBtn.Parent = ChatView
Instance.new("UICorner").Parent = SendBtn

local function CalculateTextHeight(text, width)
    local TextBase = Instance.new("TextLabel")
    TextBase.Text = text
    TextBase.TextWrapped = true
    TextBase.Size = UDim2.new(0, width, 0, 1000)
    TextBase.Font = Enum.Font.Gotham
    TextBase.TextSize = 13
    return TextBase.TextBounds.Y
end

local function CreateMessageBubble(msgItem)
    local isMe = msgItem.senderName == UserData.username
    local isSystem = msgItem.senderTag == "system"
    local rawText = msgItem.text
    
    local bubbleType = "Normal"
    if isSystem then bubbleType = "System" end
    
    if MsgHistory[msgItem.id] then return end
    MsgHistory[msgItem.id] = true
    
    local frame = Instance.new("Frame")
    frame.BackgroundTransparency = 1
    
    local textLabel = Instance.new("TextLabel")
    textLabel.TextWrapped = true
    textLabel.Font = Enum.Font.Gotham
    textLabel.TextSize = 13
    textLabel.Parent = frame
    
    local txtHeight = 30
    
    if isSystem then
        textLabel.Text = "🔔 " .. rawText
        textLabel.TextColor3 = Color3.fromRGB(255, 255, 80)
        textLabel.Size = UDim2.new(1, 0, 1, 0)
        textLabel.TextXAlignment = Enum.TextXAlignment.Center
        textLabel.BackgroundTransparency = 1
        frame.Size = UDim2.new(1, 0, 0, 30)
    else
        textLabel.Text = (not isMe and ("["..msgItem.senderTag.."] "..msgItem.senderName..":\n") or "") .. rawText
        textLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
        textLabel.TextXAlignment = Enum.TextXAlignment.Left
        textLabel.TextYAlignment = Enum.TextYAlignment.Top
        
        textLabel.BackgroundColor3 = isMe and Color3.fromRGB(0, 120, 50) or Color3.fromRGB(50, 60, 80)
        Instance.new("UICorner").Parent = textLabel
        
        -- Gambiarra de padding nativa (sem UIPadding para ser simples)
        textLabel.Text = " " .. textLabel.Text .. " "
        
        frame.Size = UDim2.new(1, 0, 0, 45) 
        if isMe then
            textLabel.AnchorPoint = Vector2.new(1, 0)
            textLabel.Position = UDim2.new(1, 0, 0, 0)
            textLabel.Size = UDim2.new(0.8, 0, 1, 0)
        else
            textLabel.AnchorPoint = Vector2.new(0, 0)
            textLabel.Position = UDim2.new(0, 0, 0, 0)
            textLabel.Size = UDim2.new(0.8, 0, 1, 0)
        end
    end
    
    frame.Parent = ChatScroll
end

local function UpdateChat()
    if not ActiveRoomId then return end
    local msgs = fetchMessages(ActiveRoomId)
    -- As msgs vêm em ASC, a query tava desc. Desc precisamos reorder.
    for i = #msgs, 1, -1 do
        local msg = msgs[i]
        CreateMessageBubble(msg)
    end
    ChatScroll.CanvasSize = UDim2.new(0, 0, 0, ChatLayout.AbsoluteContentSize.Y + 20)
    if FirstLoad then
        ChatScroll.CanvasPosition = Vector2.new(0, ChatScroll.CanvasSize.Y.Offset)
        FirstLoad = false
    else
        -- Autoscroll suave
        ChatScroll.CanvasPosition = Vector2.new(0, ChatScroll.CanvasSize.Y.Offset)
    end
end

function JoinRoom(id, name)
    RoomListView.Visible = false
    ChatView.Visible = true
    BackBtn.Parent = ChatView
    
    ActiveRoomId = id
    ActiveRoomName = name
    Title.Text = "Sala: " .. name
    
    for _, child in ipairs(ChatScroll:GetChildren()) do
        if child:IsA("Frame") then child:Destroy() end
    end
    MsgHistory = {}
    FirstLoad = true
    PollingChat = true
    
    -- Loop de Polling do Chat
    task.spawn(function()
        while PollingChat and ActiveRoomId == id do
            UpdateChat()
            task.wait(2)
        end
    end)
end

BackBtn.MouseButton1Click:Connect(function()
    PollingChat = false
    ActiveRoomId = nil
    BackBtn.Parent = nil
    ChatView.Visible = false
    RoomListView.Visible = true
    Title.Text = "Bate-Papo - Salas ("..UserData.username..")"
end)

SendBtn.MouseButton1Click:Connect(function()
    local text = MsgBox.Text
    if text ~= "" and ActiveRoomId then
        MsgBox.Text = ""
        sendMessage(ActiveRoomId, text)
        UpdateChat() -- Force update
    end
end)

-- Enter to Send
MsgBox.FocusLost:Connect(function(enterPressed)
    if enterPressed then
        local text = MsgBox.Text
        if text ~= "" and ActiveRoomId then
            MsgBox.Text = ""
            sendMessage(ActiveRoomId, text)
            UpdateChat()
        end
    end
end)

-- ========================================== --
-- EVENT LISTENER DO LOGIN
-- ========================================== --
LoginBtn.MouseButton1Click:Connect(function()
    local email = EmailBox.Text
    local pass = PassBox.Text
    if email == "" or pass == "" then 
        LoginStatus.Text = "Preencha e-mail e senha!"
        return 
    end
    
    LoginBtn.Text = "Aguarde..."
    LoginStatus.Text = ""
    local success, err = login(email, pass)
    
    if success then
        local gotData = getUserData()
        if gotData then
            OpenRoomList()
        else
            LoginBtn.Text = "ENTRAR"
            LoginStatus.Text = "Erro ao puxar dados da conta."
        end
    else
        LoginBtn.Text = "ENTRAR"
        LoginStatus.Text = err
    end
end)

warn("==========================================")
warn("Gymstars Brasil - Script de Bate-Papo Chat Carregado.")
warn("==========================================")
