import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

const log = (...args) => console.log(new Date().toISOString(), ...args);

app.use(express.json());

app.use((req, res, next) => {
  res.on('finish', () => {
    log(
      'response',
      req.method,
      req.originalUrl,
      'status',
      res.statusCode,
      'ip',
      req.ip,
      'origin',
      req.get('origin') || '-',
      'user-agent',
      req.get('user-agent') || '-'
    );
  });

  log(
    'incoming',
    req.method,
    req.originalUrl,
    'ip',
    req.ip,
    'origin',
    req.get('origin') || '-',
    'query',
    req.query,
    'body',
    req.body
  );

  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'mongo-middleware' });
});

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
  log('mongodb connected');
} catch (err) {
  log('mongodb connection failed', err instanceof Error ? err.message : err);
  process.exit(1);
}

const db = client.db('swap_meet_pets');
const petsCollection = db.collection('pets');
const crabCollection = db.collection('crabCount');

app.get('/get-pets', async (req, res) => {
  const { playername } = req.query;
  log('get-pets request', { playername, ip: req.ip, origin: req.get('origin') || '-' });

  try {
    const petDoc = await petsCollection.findOne({});

    if (!petDoc || !petDoc.players) {
      log('get-pets error', 'no pets data found');
      return res.status(404).json({ error: 'No pets data found' });
    }

    if (playername) {
      // Find player key case-insensitively for proper name
      const playerKey = Object.keys(petDoc.players).find(
        (key) => key.toLowerCase() === playername.toLowerCase()
      );

      if (playerKey) {
        log('get-pets success', playername, 'resolved as', playerKey);
        return res.json({
          player: petDoc.players[playerKey],
          properName: playerKey,
        });
      } else {
        log('get-pets error', 'player not found', playername);
        return res.status(404).json({ error: 'Player not found' });
      }
    }

    log('get-pets success', 'all players returned');
    return res.json({ players: petDoc.players });
  } catch (err) {
    log('get-pets error', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'MongoDB query failed' });
  }
});

app.get('/get-crab', async (req, res) => {
  const { playername } = req.query;
  log('get-crab request', { playername, ip: req.ip, origin: req.get('origin') || '-' });

  try {
    const crabDoc = await crabCollection.findOne({});

    if (!crabDoc || !crabDoc.players) {
      log('get-crab error', 'no crab data found');
      return res.status(404).json({ error: 'No crab data found' });
    }

    if (playername) {
      // Find player key case-insensitively for proper name
      const playerKey = Object.keys(crabDoc.players).find(
        (key) => key.toLowerCase() === playername.toLowerCase()
      );

      if (playerKey) {
        log('get-crab success', playername, 'resolved as', playerKey);
        return res.json({
          player: crabDoc.players[playerKey],
          properName: playerKey,
        });
      } else {
        log('get-crab error', 'player not found', playername);
        return res.status(404).json({ error: 'Player not found' });
      }
    }

    log('get-crab success', 'all players returned');
    return res.json({ players: crabDoc.players });
  } catch (err) {
    log('get-crab error', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'MongoDB query failed' });
  }
});

app.post('/increment-crab', async (req, res) => {
  const { playername, killCount } = req.body;
  log('increment-crab payload', { playername, killCount });

  if (!playername) {
    log('increment-crab error', 'missing playername');
    return res.status(400).json({ error: 'Missing playername' });
  }

  try {
    const update = {
      $inc: { [`players.${playername}.count`]: 1 },
    };

    const result = await crabCollection.updateOne({}, update);

    if (result.matchedCount === 0) {
      log('increment-crab error', 'player not found', playername);
      return res.status(404).json({ error: 'Player not found' });
    }

    log('increment-crab success', playername);
    res.json({ success: true, playername });
  } catch (error) {
    log('increment-crab error', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/increment-pets', async (req, res) => {
  const { playername, petName, dateGot } = req.body;

  log('increment-pets payload', { playername, petName, dateGot });

  if (!playername) {
    log('increment-pets error', 'missing playername');
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

    const result = await petsCollection.updateOne({}, update);

    if (result.matchedCount === 0) {
      log('increment-pets error', 'player not found', playername);
      return res.status(404).json({ error: 'Player not found' });
    }

    log('increment-pets success', playername);
    res.json({ success: true, playername });
  } catch (error) {
    log('increment-pets error', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Listening on port ${process.env.PORT || 3000}`);
});
