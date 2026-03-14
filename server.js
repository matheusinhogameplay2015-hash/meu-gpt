import express from "express"
import session from "express-session"
import fs from "fs"
import stringSimilarity from "string-similarity"
import google from "googlethis"
import { pipeline } from "@xenova/transformers"

const app = express()

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use(session({
  secret:"segredo123",
  resave:false,
  saveUninitialized:true
}))

// piadas
const piadas = [
"Por que o programador foi ao médico? Porque tinha muitos bugs.",
"O que o JavaScript disse para o HTML? Você me completa.",
"Quantos programadores trocam uma lâmpada? Nenhum, é problema de hardware."
]

// memória
let memoria = {}

if(fs.existsSync("memoria.json")){
  memoria = JSON.parse(fs.readFileSync("memoria.json"))
}

// IA
let gerador = null

async function carregarIA(){
  try{
    gerador = await pipeline(
      "text-generation",
      "Xenova/distilgpt2",
      {dtype:"q4"}
    )
    console.log("IA carregada")
  }catch{
    console.log("IA não carregou")
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

app.post("/chat",async(req,res)=>{

let texto = (req.body.msg || "").trim()

if(!texto){
  return res.json({resposta:"Digite algo."})
}

// normalizar texto
texto = texto
.toLowerCase()
.normalize("NFD")
.replace(/[\u0300-\u036f]/g,"")

let user = req.session

// salvar nome
if(texto.includes("meu nome e")){

let nome = texto.replace("meu nome e","").trim()

user.nome = nome

return res.json({
resposta:"Prazer em conhecer você "+nome
})

}

// lembrar nome
if(texto.includes("qual e meu nome")){

if(user.nome){

return res.json({
resposta:"Seu nome é "+user.nome
})

}else{

return res.json({
resposta:"Você ainda não me disse seu nome."
})

}

}

// piada
if(texto.includes("piada")){

let p = piadas[Math.floor(Math.random()*piadas.length)]

return res.json({resposta:p})

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

// memória fuzzy
let perguntas = Object.keys(memoria)

if(perguntas.length>0){

let match = stringSimilarity.findBestMatch(texto,perguntas)

if(match.bestMatch.rating>0.85){

return res.json({
resposta:memoria[match.bestMatch.target]
})

}

}

// wikipedia apenas se for pergunta
if(
texto.startsWith("o que e") ||
texto.startsWith("quem e")
){

let termo = texto
.replace("o que e","")
.replace("quem e","")
.trim()

let resumo = await wiki(termo)

if(resumo){

return res.json({
resposta:resumo.substring(0,400)
})

}

}

// IA
if(gerador){

try{

let r = await gerador(texto,{
max_new_tokens:40
})

let resp = r[0].generated_text
.replace(texto,"")
.trim()

if(resp.length>3){

return res.json({resposta:resp})

}

}catch{}

}

// fallback
res.json({
resposta:"Ainda estou aprendendo. Pode me ensinar usando aprender=pergunta|resposta"
})

})

const PORT = process.env.PORT || 3000

app.listen(PORT,()=>{
console.log("GPT rodando porta "+PORT)
})
