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
      const playerData = petDoc.players[playername];

      if (playerData !== undefined) {
        return res.json({ player: playerData });
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
  const { playername } = req.body;

  if (!playername) {
    return res.status(400).json({ error: 'Missing playername' });
  }

  try {
    const result = await petsCollection.updateOne(
      {},
      {
        $inc: { [`players.${playername}.totalPets`]: 1 },
        $setOnInsert: { [`players.${playername}.mostRecentPet`]: '' },
      },
      { upsert: true }
    );

    if (result.matchedCount === 0 && !result.upsertedCount) {
      return res.status(404).json({ error: 'Player not found or created' });
    }

    res.json({ success: true, playername });
  } catch (error) {
    console.error('Increment error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.post('/update-recent-pet', async (req, res) => {
  const { playername, petName, dateGot } = req.body;

  if (!playername || !petName || !dateGot) {
    return res
      .status(400)
      .json({ error: 'Missing playername, petName, or dateGot' });
  }

  try {
    const result = await petsCollection.updateOne(
      {},
      {
        $set: {
          [`players.${playername}.mostRecentPet`]: { name: petName, dateGot },
        },
      },
      { upsert: true }
    );

    if (result.matchedCount === 0 && !result.upsertedCount) {
      return res.status(404).json({ error: 'Player not found or created' });
    }

    res.json({
      success: true,
      playername,
      mostRecentPet: { name: petName, dateGot },
    });
  } catch (error) {
    console.error('Update recent pet error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Listening on port ${process.env.PORT || 3000}`);
});
