const express = require("express")
const fs = require("fs")
const similarity = require("string-similarity")

const app = express()

app.use(express.json())
app.use(express.static("."))

let memoria = {}

if (fs.existsSync("memoria.json")) {
  memoria = JSON.parse(fs.readFileSync("memoria.json"))
}

app.post("/chat", async (req, res) => {

  let texto = req.body.msg
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")

  // sistema de aprendizado
  if (texto.startsWith("aprender=")) {

    let dados = texto.replace("aprender=", "").split("|")

    if (dados.length == 2) {

      memoria[dados[0]] = dados[1]

      fs.writeFileSync("memoria.json", JSON.stringify(memoria, null, 2))

      return res.json({ resposta: "Aprendi 👍" })
    }
  }

  // procurar pergunta parecida
  let perguntas = Object.keys(memoria)

  if (perguntas.length > 0) {

    let match = similarity.findBestMatch(texto, perguntas)

    if (match.bestMatch.rating > 0.5) {

      let perguntaCorrigida = match.bestMatch.target

      return res.json({ resposta: memoria[perguntaCorrigida] })
    }
  }

  // busca na wikipedia
  try {

    let url = "https://pt.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(texto)

    let respostaWiki = await fetch(url)

    let data = await respostaWiki.json()

    if (data.extract) {

      return res.json({
        resposta: data.extract.substring(0, 400)
      })

    }

  } catch (erro) {}

  // resposta padrão
  res.json({ resposta: "Ainda não sei responder isso." })

})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("GPT rodando na porta " + PORT)
})
