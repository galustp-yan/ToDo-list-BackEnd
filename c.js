const express = require('express');
const session = require('express-session');

const app = express();
const PORT = 3000;

// Configure the session middleware
app.use(session({
  secret: 'your_secret_key',  // Replace with your own secret key
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }  // Set to true if using HTTPS
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Route to set the session email
app.post('/set-email', (req, res) => {
  const { email } = req.body;
  req.session.email = email;
  res.send(`Session email set: ${email}`);
});

// Route to check the session email
app.get('/check-session', (req, res) => {
  console.log(req.session);  // Log the session for debugging purposes
  if (req.session.email) {
    res.json({ err: "Successfully" });  // Typo corrected: "Successfully"
  } else {
    res.json({ err: "Error" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
