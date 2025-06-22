const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

// In-memory data
let polls = [];
let users = {};

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));

// Middleware to simulate auth
app.post('/login', (req, res) => {
  const { username } = req.body;
  if (username) {
    req.session.user = username;
    users[username] = users[username] || [];
  }
  res.redirect('/');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Create new poll
app.post('/polls', (req, res) => {
  if (!req.session.user) return res.status(401).send('Login required');

  const { question, options } = req.body;
  const opts = options.split(',').map(o => o.trim());
  const poll = {
    id: Date.now().toString(),
    question,
    options: opts.map(opt => ({ text: opt, votes: 0 })),
    createdBy: req.session.user
  };
  polls.push(poll);
  users[req.session.user].push(poll.id);
  res.redirect('/');
});

// View poll
app.get('/polls/:id', (req, res) => {
  const poll = polls.find(p => p.id === req.params.id);
  if (!poll) return res.send('Poll not found');

  const labels = JSON.stringify(poll.options.map(o => o.text));
  const votes = JSON.stringify(poll.options.map(o => o.votes));

  res.render('poll', {
    poll,
    user: req.session.user,
    labels,
    votes
  });
});

// Vote
app.post('/vote/:id', (req, res) => {
  const poll = polls.find(p => p.id === req.params.id);
  if (!poll) return res.send('Poll not found');

  const option = poll.options.find(o => o.text === req.body.option);
  if (option) option.votes += 1;

  res.redirect('/polls/' + poll.id);
});

// Add new option
app.post('/polls/:id/add-option', (req, res) => {
  if (!req.session.user) return res.status(401).send('Login required');
  const poll = polls.find(p => p.id === req.params.id);
  if (!poll) return res.send('Poll not found');

  poll.options.push({ text: req.body.newOption, votes: 0 });
  res.redirect('/polls/' + poll.id);
});

// Delete poll
app.post('/polls/:id/delete', (req, res) => {
  const poll = polls.find(p => p.id === req.params.id);
  if (!poll || poll.createdBy !== req.session.user) return res.status(403).send('Forbidden');

  polls = polls.filter(p => p.id !== req.params.id);
  users[req.session.user] = users[req.session.user].filter(pid => pid !== req.params.id);
  res.redirect('/');
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
