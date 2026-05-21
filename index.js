const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
const uri = process.env.MONGODB_URI;
const app = express();

const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    console.log(payload);
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Forbidden' });
  }
};

async function run() {
  try {
    // await client.connect();

    const db = client.db('PetHaven');
    const allPets = db.collection('pets');
    const clientRequest = db.collection('Client_Request');

    app.get('/pets', async (req, res) => {
      const { search, species } = req.query;
      // initialy query te kono info nai tai sob data ashbe jodi search and species na thake
      let query = {};

      // i mane case insensitive mane uppercase r lowercase soman
      if (search) {
        query.PetName = { $regex: search, $options: 'i' };
      }

      // species a kisu na kisu hobe but all hobe na tobei oi specis onujai filter hobe noyto sob data jabe
      if (species && species !== 'all') {
        query.species = { $in: [species] };
      }

      const result = await allPets.find(query).toArray();
      res.json(result);
    });

    app.post('/pets', verifyToken, async (req, res) => {
      const pet = req.body;
      console.log(pet);
      const result = await allPets.insertOne(pet);
      res.json(result);
    });

    app.get('/request', async (req, res) => {
      const result = await clientRequest.find().toArray();
      res.json(result);
    });

    app.delete('/request/:id', verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await clientRequest.deleteOne({ _id: new ObjectId(id) });
      res.json(result);
    });

    app.delete('/pets/:id', verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await allPets.deleteOne({ _id: new ObjectId(id) });
      res.json(result);
    });

    app.patch('/request/:id', verifyToken, async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;
      const result = await clientRequest.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: status } },
      );
      res.json(result);
    });

    app.patch('/pets/:id', verifyToken, async (req, res) => {
      const { id } = req.params;
      const updateData = req.body;

      delete updateData._id;

      const result = await allPets.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData },
      );
      res.json(result);
    });

    app.post('/request', verifyToken, async (req, res) => {
      const request = req.body;
      console.log(request);
      const result = await clientRequest.insertOne(request);
      res.json(result);
    });

    app.get('/pets/:id', async (req, res) => {
      const { id } = req.params;
      const result = await allPets.findOne({ _id: new ObjectId(id) });
      res.json(result);
    });

    // await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!',
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Server is running fine!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
