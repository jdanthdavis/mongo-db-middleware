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

  try {
    const petDoc = await petsCollection.findOne({});

    if (!petDoc || !petDoc.players) {
      return res.status(404).json({ error: 'No pets data found' });
    }

    if (playername) {
      const playerKey = Object.keys(petDoc.players).find(
        (key) => key.toLowerCase() === playername.toLowerCase()
      );

      if (playerKey) {
        return res.json({
          player: petDoc.players[playerKey],
          properName: playerKey,
        });
      } else {
        return res.status(404).json({ error: 'Player not found' });
      }
    }

    return res.json({ players: petDoc.players });
  } catch (err) {
    console.error('MongoDB error:', err);
    res.status(500).json({ error: 'MongoDB query failed' });
  }
});

app.post('/increment-pets', async (req, res) => {
  const { playername, petName, dateGot } = req.body;

  if (!playername) {
    return res.status(400).json({ error: 'Missing playername' });
  }

  try {
    const update = {
      $inc: { [`players.${playername}.totalPets`]: 1 },
    };

    if (petName && dateGot) {
      update.$set = {
        [`players.${playername}.mostRecentPet`]: {
          name: petName,
          dateGot,
        },
      };
    }

    update.$setOnInsert = {
      [`players.${playername}.totalPets`]: 0,
      [`players.${playername}.mostRecentPet`]: {
        name: petName || '',
        dateGot: dateGot || '',
      },
    };

    const result = await petsCollection.updateOne(
      {}, // Assuming a single document contains all players
      update,
      { upsert: true }
    );

    if (result.matchedCount === 0 && result.upsertedCount === 0) {
      return res.status(404).json({ error: 'Player not found or created' });
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
