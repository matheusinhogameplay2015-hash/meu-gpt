const express = require("express")
const fs = require("fs")
const wiki = require("wikipedia")
wiki.setLang("pt")
let conversa = {}

const app = express()

app.use(express.json())
app.use(express.static("."))

let memoria = {}

if (fs.existsSync("memoria.json")) {
  memoria = JSON.parse(fs.readFileSync("memoria.json"))
}

app.post("/chat", async (req, res) => {
if(texto.startsWith("meu nome é ")){

let nome = texto.replace("meu nome é ","")

conversa.nome = nome

return res.json({resposta:"Ok, vou lembrar que seu nome é "+nome})
}

if(texto.includes("qual meu nome")){

if(conversa.nome){
return res.json({resposta:"Seu nome é "+conversa.nome})
}else{
return res.json({resposta:"Você ainda não me disse seu nome"})
}

}
  let texto = req.body.msg.toLowerCase()

  // aprender
  if (texto.startsWith("aprender=")) {

    let dados = texto.replace("aprender=", "").split("|")

    memoria[dados[0]] = dados[1]

    fs.writeFileSync("memoria.json", JSON.stringify(memoria, null, 2))

    return res.json({ resposta: "Aprendi 👍" })
  }

  // wikipedia
if (texto.startsWith("wiki ")) {

  let busca = texto.replace("wiki ", "")

  try {

    let url = "https://pt.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(busca)

    let respostaWiki = await fetch(url)

    let data = await respostaWiki.json()

    if(data.extract){
      return res.json({resposta:data.extract.substring(0,500)})
    }else{
      return res.json({resposta:"Não encontrei na Wikipedia"})
    }

  } catch {

    return res.json({resposta:"Erro ao buscar na Wikipedia"})

  }

}
  let resposta = memoria[texto] || "Não sei responder"

  res.json({ resposta })

})

app.listen(3000, () => {
  console.log("GPT rodando")

})
