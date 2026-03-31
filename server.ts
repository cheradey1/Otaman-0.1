import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Resend } from "resend";

const app = express();
const PORT = 3000;

// Initialize Resend with API Key from environment
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

app.use(express.json());

// API route to send coordinates to drivers
app.post("/api/send-coordinates", async (req, res) => {
  const { trucks } = req.body;

  if (!trucks || !Array.isArray(trucks)) {
    return res.status(400).json({ error: "Invalid trucks data" });
  }

  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Email sending is disabled.");
    return res.status(500).json({ 
      error: "Email service not configured. Please set RESEND_API_KEY in environment variables.",
      mock: true 
    });
  }

  try {
    const results = await Promise.all(
      trucks.map(async (truck) => {
        if (!truck.email || !truck.email.includes("@")) return null;

        const mapsUrl = `https://www.google.com/maps?q=${truck.position[0]},${truck.position[1]}`;
        
        return resend.emails.send({
          from: "Otaman Defense <onboarding@resend.dev>",
          to: truck.email,
          subject: `Бойове завдання: Координати позиції #${truck.id}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; background: #0a0a0a; color: #fff; border: 1px solid #f27d26;">
              <h1 style="color: #f27d26; text-transform: uppercase; letter-spacing: 2px;">Бойове завдання</h1>
              <p>Ваша позиція розрахована системою Otaman.</p>
              <div style="background: #1a1a1a; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Позиція:</strong> ${truck.position[0].toFixed(6)}, ${truck.position[1].toFixed(6)}</p>
                <p><strong>Машина:</strong> #${truck.id}</p>
              </div>
              <a href="${mapsUrl}" style="display: inline-block; background: #f27d26; color: #fff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px;">ВІДКРИТИ В GOOGLE MAPS</a>
              <p style="margin-top: 30px; font-size: 12px; color: #666;">Це автоматичне повідомлення від системи ППО Otaman.</p>
            </div>
          `,
        });
      })
    );

    res.json({ success: true, results: results.filter(r => r !== null) });
  } catch (error) {
    console.error("Error sending emails:", error);
    res.status(500).json({ error: "Failed to send emails" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
