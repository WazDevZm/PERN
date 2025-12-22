import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (req, res) => {
    res.json({ message: 'Hello from server' });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server listening on ${port}`));

export default app;

// The previous server setup is replaced with the complete implementation above.