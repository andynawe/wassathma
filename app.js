/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.

 */

import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const { WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN, PORT } = process.env;

app.post("/webhook", async (req, res) => {
  // log incoming messages
  console.log("Incoming webhook message:", JSON.stringify(req.body, null, 2));

  // check if the webhook request contains a message
  // details on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  const message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0];
 
  // check if the incoming message contains text
  if (message?.type === "text") {
    // extract the business number to send the reply from it
    const business_phone_number_id = req.body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id;
    const numero = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
    const mensaje = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body;
    
    const mensaje1 = message.text?.body;

    // Definir la respuesta según el mensaje recibido
    let respuestaTexto = "";

    if (mensaje1 === "1") {
      
      try {
    // Llamada a la API del HMA
    const hmaResponse = await axios.post(
      "https://www.hma.gob.pe/consultas/api/obtenerProcedenciaResultado",
      {
        Celular: numero.substring(2), // El número que envía el mensaje
        TipoConsulta: "HISTORIA"
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    // Procesar respuesta
    const data = hmaResponse.data?.Data;
    if (hmaResponse.data?.Respuesta === "0000" && data) {
      respuestaTexto = `✅ Datos encontrados:\nPaciente: ${data.Paciente}\nDNI: ${data.Documento}\nHistoria: ${data.Historia}\nNacimiento: ${data.FechaNacimiento}\nSexo: ${data.Sexo}`;
    } else {
      respuestaTexto = "⚠️ No se encontraron datos asociados al número proporcionado.";
    }

  } catch (error) {
    console.error("Error consultando API HMA:", error.message);
    respuestaTexto = "❌ Ocurrió un error al consultar los datos.";
  }
      
    } else if (mensaje1 === "2") {
      respuestaTexto = "opción 2 seleccionada";
    } else if (mensaje1 === "3") {
      respuestaTexto = "opción 3 seleccionada";
    } else if (mensaje1 === "4") {
      respuestaTexto = "opción 4 seleccionada";
    } else {
      //respuestaTexto = `Echo: ${mensaje} ${numero}`;
      respuestaTexto = numero;
    }

    // send a reply message as per the docs here https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v22.0/${business_phone_number_id}/messages`,
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        to: message.from,
          //text: { body: "Echo: " + message.text.body + " " + numero},
          text: { body: respuestaTexto},
          context: {
            message_id: message.id, // shows the message as a reply to the original user message
        },
      },
    });

    // mark incoming message as read
    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v22.0/${business_phone_number_id}/messages`,
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        status: "read",
        message_id: message.id,
      },
    });
  }

  res.sendStatus(200);
});

// accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // check the mode and token sent are correct
  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    // respond with 200 OK and challenge token from the request
    
    res.status(200).send(challenge);
    console.log("Webhook verified successfully!");
  } else {
    // respond with '403 Forbidden' if verify tokens do not match
    res.sendStatus(403);
  }
});

app.get("/", (req, res) => {
  res.send(`<pre>Nothing to see here.
Checkout README.md to start.</pre>`);
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port: ${PORT}`);
});
