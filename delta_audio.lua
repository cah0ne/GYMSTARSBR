-- ========================================== --
-- GYMSTARS BRASIL - DELTA / ROBLOX EXECUTOR
-- ÁUDIO AO VIVO EM TEMPO REAL (MUNDIAL)
-- ========================================== --

local HttpService = game:GetService("HttpService")
local Workspace = game:GetService("Workspace")

-- Endpoint direto do Firebase (Acesso global anônimo aprovado no Firestore rules)
local endpointUrl = "https://firestore.googleapis.com/v1/projects/avian-point-s83b3/databases/ai-studio-2416c944-2ca0-4054-aae3-0e3392d7a1a0/documents/liveCommand/audio?key=AIzaSyDHNfoZ8qb5QUqO72fAtFH6HFb4TgVitoc"

-- Funções do executor Delta/Fluxus/Synapse
local req = (syn and syn.request) or (http and http.request) or http_request or (fluxus and fluxus.request) or request
local getasset = getcustomasset or getsynasset

if not req then
    warn("[Gymstars] ERRO: Seu executor não suporta requisições HTTP!")
    return
end

-- Decodificador Base64 Fallback
local b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
local function base64_decode_lua(data)
    data = string.gsub(data, '[^'..b..'=]', '')
    return (data:gsub('.', function(x)
        if (x == '=') then return '' end
        local r,f='',(b:find(x)-1)
        for i=6,1,-1 do r=r..(f%2^i-f%2^(i-1)>0 and '1' or '0') end
        return r;
    end):gsub('%d%d%d?%d?%d?%d?%d?%d?', function(x)
        if (#x ~= 8) then return '' end
        local c=0
        for i=1,8 do c=c+(x:sub(i,i)=='1' and 2^(8-i) or 0) end
        return string.char(c)
    end))
end

local base64Decode = (crypt and crypt.base64_decode) or (crypt and crypt.base64decode) or (syn and syn.crypt and syn.crypt.base64.decode) or base64_decode_lua

local SoundEngine = Instance.new("Sound")
SoundEngine.Name = "GymstarsLiveAudio"
SoundEngine.Parent = Workspace
SoundEngine.Volume = 1
SoundEngine.Looped = false

local SfxEngine = Instance.new("Sound")
SfxEngine.Name = "GymstarsLiveSfx"
SfxEngine.Parent = Workspace
SfxEngine.Volume = 0.5
SfxEngine.Looped = false

local lastUpdated = 0
local isPlaying = false
local isFirstLoad = true

warn("==========================================")
warn("Gymstars Brasil - Áudio Ao Vivo Conectado!")
warn("Você ouvirá tudo que o Árbitro tocar mundialmente.")
warn("==========================================")

-- Notificação In-game e Som de Confirmação de Execução
pcall(function()
    local StarterGui = game:GetService("StarterGui")
    StarterGui:SetCore("SendNotification", {
        Title = "Gymstars Brasil",
        Text = "Áudio Ao Vivo Ativado! Tudo pronto para ouvir os comandos do árbitro.",
        Duration = 5
    })
    
    local StartupSfx = Instance.new("Sound")
    StartupSfx.Name = "GymstarsStartupSfx"
    StartupSfx.Parent = Workspace
    StartupSfx.Volume = 1
    StartupSfx.SoundId = "rbxassetid://4590662766" -- Som de sucesso/notificação
    StartupSfx:Play()
    game:GetService("Debris"):AddItem(StartupSfx, 3)
end)

-- Trata links externos
local function treatUrl(url)
    if string.find(url, "dropbox.com") then
        url = string.gsub(url, "dl=0", "dl=1")
    end
    return url
end

local function downloadAndPlayAsset(url)
    if not getasset or not writefile then
        warn("[Gymstars] Executor sem getcustomasset/writefile.")
        return nil
    end

    local fileName = "gymstars_live_audio_" .. tostring(math.random(1000, 9999)) .. ".mp3"
    
    -- Trata uploads de músicas base64
    if string.find(url, "data:audio") and string.find(url, "base64,") then
        print("[Gymstars] Decodificando áudio da base de dados...")
        local base64parts = string.split(url, "base64,")
        if #base64parts > 1 then
            local decodedAudio = base64Decode(base64parts[2])
            writefile(fileName, decodedAudio)
            return getasset(fileName)
        end
    end
    
    -- Trata Links Dropbox / MP3
    print("[Gymstars] Baixando arquivo de áudio...")
    url = treatUrl(url)
    local s, r = pcall(function() return req({Url = url, Method = "GET"}) end)
    if s and r.StatusCode == 200 then
        writefile(fileName, r.Body)
        return getasset(fileName)
    else
        warn("[Gymstars] Falha ao baixar áudio.")
        return nil
    end
end

local function checkLiveAudio()
    local s, r = pcall(function() return req({Url = endpointUrl, Method = "GET"}) end)
    
    if s and r.StatusCode == 200 then
        local data = HttpService:JSONDecode(r.Body)
        
        if data.fields then
            local fields = data.fields
            local action = fields.action and fields.action.stringValue
            
            -- Pega o timestamp, vindo como stringValue, integerValue ou doubleValue
            local updatedAtField = fields.updatedAt
            local updatedAtStr = updatedAtField and (updatedAtField.integerValue or updatedAtField.doubleValue or updatedAtField.stringValue)
            local updatedAt = tonumber(updatedAtStr) or 0
            
            local url = fields.url and fields.url.stringValue
            local gymnastName = fields.gymnastName and fields.gymnastName.stringValue
            
            -- Executa se houver novo updatedAt
            if updatedAt > lastUpdated then
                local wasFirstLoad = isFirstLoad
                isFirstLoad = false 
                lastUpdated = updatedAt
                
                if wasFirstLoad then
                    -- Ignora tocar o comando velho que estava salvo no banco quando o script acabou de rodar
                    return
                end
                
                if action == "stop_music" then
                    isPlaying = false
                    SoundEngine:Stop()
                    print("[Gymstars] Árbitro PAUSOU a música.")
                    
                elseif action == "beep" then
                    SfxEngine.SoundId = "rbxassetid://1347140027"
                    SfxEngine:Play()
                    print("[Gymstars] BEEP tocado.")
                    
                elseif action == "play_music" then
                    isPlaying = true
                    
                    if fields.triggerBeep and fields.triggerBeep.booleanValue then
                        SfxEngine.SoundId = "rbxassetid://1347140027"
                        SfxEngine:Play()
                    end
                    
                    local gymnast = tostring(gymnastName or "Competidor")
                    print("[Gymstars] Árbitro SOLTOU a música de " .. gymnast .. "!")
                    
                    pcall(function()
                        game:GetService("StarterGui"):SetCore("SendNotification", {
                            Title = "Música Iniciada",
                            Text = "O som de " .. gymnast .. " está tocando agora",
                            Duration = 5
                        })
                    end)
                    
                    if url then
                        -- Usa uma nova thread pra baixar, senão o executor irá congelar sua tela do Roblox.
                        task.spawn(function()
                            local localAsset = downloadAndPlayAsset(url)
                            if localAsset then
                                SoundEngine.SoundId = localAsset
                                SoundEngine.TimePosition = 0
                                SoundEngine:Play()
                            else
                                warn("[Gymstars] Não foi possível reproduzir este formato de link no Roblox nativamente.")
                            end
                        end)
                    end
                end
            end
        end
    end
end

-- Thread paralela pro Polling na database do site (Atualiza cada 1.5 Segundos)
task.spawn(function()
    while true do
        task.wait(1.5)
        checkLiveAudio()
    end
end)
