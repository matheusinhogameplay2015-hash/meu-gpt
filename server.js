import express from "express"
import session from "express-session"
import fs from "fs"
import stringSimilarity from "string-similarity"
import google from "googlethis"
import { pipeline } from "@xenova/transformers"

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(session({
  secret: process.env.SESSION_SECRET || "segredo",
  resave: false,
  saveUninitialized: true
}))

// piadas
const piadas = [
"Por que o programador foi ao médico? Porque tinha muitos bugs.",
"O que o JavaScript disse para o HTML? Você me completa.",
"Por que o computador foi preso? Porque executou processos ilegais.",
"Quantos programadores trocam uma lâmpada? Nenhum, é problema de hardware.",
"Por que o programador confundiu Halloween e Natal? Porque OCT 31 = DEC 25."
]

// memória
let memoria = {}

if (fs.existsSync("memoria.json")) {
  memoria = JSON.parse(fs.readFileSync("memoria.json"))
}

// carregar IA
let gerador = null

async function carregarIA(){
  try{

    console.log("carregando IA...")

    gerador = await pipeline(
      "text-generation",
      "Xenova/distilgpt2",
      { dtype: "q4" }
    )

    console.log("IA carregada")

  }catch(e){

    console.log("falha ao carregar IA")

    gerador = null

  }
}

carregarIA()

// wikipedia
async function wiki(termo){

  try{

    let url =
    "https://pt.wikipedia.org/api/rest_v1/page/summary/" +
    encodeURIComponent(termo)

    let r = await fetch(url)

    let data = await r.json()

    return data.extract

  }catch{

    return null

  }

}

app.post("/chat", async (req,res)=>{

let texto = (req.body.msg || "").trim()

if(!texto){

return res.json({resposta:"Digite algo."})

}

texto = texto
.toLowerCase()
.normalize("NFD")
.replace(/[\u0300-\u036f]/g,"")

let user = req.session

// salvar nome
if(texto.startsWith("meu nome e ")){

let nome = texto.replace("meu nome e ","")

user.nome = nome

return res.json({resposta:"Prazer "+nome})

}

// lembrar nome
if(texto.includes("qual e meu nome")){

if(user.nome){

return res.json({resposta:"Seu nome é "+user.nome})

}

return res.json({resposta:"Ainda não sei seu nome."})

}

// aprender
if(texto.startsWith("aprender=")){

let dados = texto.replace("aprender=","").split("|")

if(dados.length==2){

memoria[dados[0]] = dados[1]

fs.writeFileSync(
"memoria.json",
JSON.stringify(memoria,null,2)
)

return res.json({resposta:"Aprendi 👍"})

}

}

// fuzzy match
let perguntas = Object.keys(memoria)

if(perguntas.length>0){

let match = stringSimilarity.findBestMatch(texto,perguntas)

if(match.bestMatch.rating>0.85){

return res.json({
resposta: memoria[match.bestMatch.target]
})

}

}

// piadas
if(texto.includes("piada")){

let p = piadas[Math.floor(Math.random()*piadas.length)]

return res.json({resposta:p})

}

// google
if(texto.startsWith("pesquisar ")){

let busca = texto.replace("pesquisar ","")

let r = await google.search(busca)

if(r.results.length>0){

return res.json({
resposta:
r.results[0].title +
" - " +
r.results[0].description
})

}

}

// wikipedia
if(texto.startsWith("o que e") || texto.startsWith("quem e")){

let termo = texto
.replace("o que e","")
.replace("quem e","")
.trim()

let resumo = await wiki(termo)

if(resumo){

return res.json({
resposta: resumo.substring(0,400)
})

}

}

// IA local
if(gerador){

try{

let r = await gerador(texto,{
max_new_tokens:50
})

return res.json({
resposta: r[0].generated_text
})

}catch{}

}

res.json({
resposta:"Ainda não sei responder isso."
})

})

app.get("/health",(req,res)=>{

res.send("ok")

})

const PORT = process.env.PORT || 3000

app.listen(PORT,()=>{

console.log("GPT rodando porta "+PORT)

})
