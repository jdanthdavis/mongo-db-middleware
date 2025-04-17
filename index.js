import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(express.json());

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  })
);

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

try {
  await client.connect();
  console.log('MongoDB connected');
} catch (err) {
  console.error('MongoDB connection failed:', err);
  process.exit(1);
}

const db = client.db('swap_meet_pets');
const petsCollection = db.collection('pets');

app.get('/get-pets', async (req, res) => {
  const { playername } = req.query;
  if (!playername) {
    return res.status(400).json({ error: 'Playername is required' });
  }

  try {
    const pet = await petsCollection.findOne({
      [`players.${playername}`]: { $exists: true },
    });

    if (pet && pet.players?.[playername] !== undefined) {
      res.json({ score: pet.players[playername] });
    } else {
      res.status(404).json({ error: 'Player not found' });
    }
  } catch (err) {
    console.error('MongoDB error:', err);
    res.status(500).json({ error: 'MongoDB query failed' });
  }
});

app.post('/increment-pets', async (req, res) => {
  const { playername } = req.body;

  if (!playername) {
    return res.status(400).json({ error: 'Missing playername' });
  }

  try {
    const result = await petsCollection.updateOne(
      {},
      { $inc: { [`players.${playername}`]: 1 } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Player not found in DB' });
    }

    res.json({ success: true, playername });
  } catch (error) {
    console.error('Increment error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Listening on port ${process.env.PORT || 3000}`);
});
