const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const app = express();
app.use(express.json());

app.use(cors());
mongoose
  .connect('mongodb+srv://vishalaggarwal270:Nvy1HI7eJ2guvoEN@barcodeproject.d43bd.mongodb.net/mydatabase2', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Role Schema
const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  url: { type: String, required: true },
});
const Role = mongoose.model('Role', RoleSchema);

// User Schema
const SSOuserSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
});
const SSOuser = mongoose.model('SSOuser', SSOuserSchema);

const getUserRoles = async (userId) => {
  try {
    const user = await SSOuser.findById(userId).populate('roles'); // Populating roles
    if (!user) {
      return console.log('User not found');
    }
    console.log('User Roles:', user.roles);
    return user.roles;
  } catch (error) {
    console.error('Error fetching user roles:', error);
  }
};




// Routes

// 1. Create a User (Register)
app.post('/users', async (req, res) => {
  try {
    const { name, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new SSOuser({ name, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/roles', async (req, res) => {
  try {
    const { userId } = req.body;
    console.log({ userId });

    const user = await SSOuser.findById(userId).populate('roles');

    if (!user || !user.roles || user.roles.length === 0) {
      return res.json([]); // Always return an array
    }

    console.log('User Roles:', user.roles);
    res.json(user.roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Get All Users
app.get('/users', async (req, res) => {
  try {
    const users = await SSOuser.find().populate('roles');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Create a Role
app.post('/roles', async (req, res) => {
  try {
    const { name, url } = req.body;
    const newRole = new Role({ name, url });
    await newRole.save();
    res.status(201).json({ message: 'Role created successfully', role: newRole });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Add Role to User
app.put('/users/:id/roles', async (req, res) => {
  try {
    const { roleId } = req.body;
    const user = await SSOuser.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.roles.includes(roleId)) {
      user.roles.push(roleId);
      await user.save();
    }
    res.json({ message: 'Role added successfully', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Remove Role from User
app.delete('/users/:id/roles', async (req, res) => {
  try {
    const { roleId } = req.body;
    const user = await SSOuser.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.roles = user.roles.filter((id) => id.toString() !== roleId);
    await user.save();
    res.json({ message: 'Role removed successfully', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. User Login (without JWT)
app.post('/login', async (req, res) => {
  try {
    const { name, password } = req.body;
    const user = await SSOuser.findOne({ name }).populate('roles');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' });

    res.json({ message: 'Login successful', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





// Server Start
const PORT = 5002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
