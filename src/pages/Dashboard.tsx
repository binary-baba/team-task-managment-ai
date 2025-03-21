import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip
} from '@mui/material';
import { Menu, LogOut, LayoutDashboard, Users, CheckSquare, Plus, Edit2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  doc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignedTo: string;
  assignedToName: string;
  createdBy: string;
}

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export default function Dashboard() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    assignedTo: ''
  });

  useEffect(() => {
    if (!user) return;

    // Fetch tasks
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('assignedTo', '==', user.uid)
    );

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(taskList);
    });

    // Fetch users
    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const userList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      setUsers(userList);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeUsers();
    };
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };

  const handleCreateTask = async () => {
    try {
      if (!user) return;

      const assignedUser = users.find(u => u.id === taskForm.assignedTo);
      
      await addDoc(collection(db, 'tasks'), {
        ...taskForm,
        createdBy: user.uid,
        assignedToName: assignedUser?.fullName || '',
        createdAt: new Date().toISOString()
      });

      setOpenTaskDialog(false);
      setTaskForm({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        assignedTo: ''
      });
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        status: newStatus
      });
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const renderTaskList = () => (
    <Grid item xs={12}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Tasks</Typography>
          <Button
            variant="contained"
            startIcon={<Plus />}
            onClick={() => setOpenTaskDialog(true)}
          >
            Create Task
          </Button>
        </Box>
        {tasks.length === 0 ? (
          <Typography color="text.secondary">No tasks available.</Typography>
        ) : (
          tasks.map((task) => (
            <Paper
              key={task.id}
              sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {task.title}
                </Typography>
                <Box>
                  <Chip
                    label={task.status}
                    color={getStatusColor(task.status)}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={task.priority}
                    color={getPriorityColor(task.priority)}
                    size="small"
                  />
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {task.description}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Assigned to: {task.assignedToName}
                </Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={task.status}
                    onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                    variant="outlined"
                    size="small"
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Paper>
          ))
        )}
      </Paper>
    </Grid>
  );

  const renderUserList = () => (
    <Grid item xs={12}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Team Members</Typography>
        <List>
          {users.map((user) => (
            <ListItem key={user.id} sx={{ borderBottom: '1px solid #eee', py: 2 }}>
              <ListItemText
                primary={user.fullName}
                secondary={
                  <React.Fragment>
                    <Typography component="span" variant="body2" color="text.primary">
                      {user.email}
                    </Typography>
                    {" — "}
                    <Chip
                      label={user.role}
                      size="small"
                      color={user.role === 'admin' ? 'error' : 'default'}
                    />
                  </React.Fragment>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Grid>
  );

  const drawerContent = (
    <Box sx={{ width: 250 }} role="presentation">
      <List>
        <ListItem button onClick={() => setCurrentView('dashboard')}>
          <ListItemIcon>
            <LayoutDashboard size={24} />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button onClick={() => setCurrentView('tasks')}>
          <ListItemIcon>
            <CheckSquare size={24} />
          </ListItemIcon>
          <ListItemText primary="Tasks" />
        </ListItem>
        <ListItem button onClick={() => setCurrentView('team')}>
          <ListItemIcon>
            <Users size={24} />
          </ListItemIcon>
          <ListItemText primary="Team" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2 }}
          >
            <Menu />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Task Management
          </Typography>
          <Button color="inherit" onClick={handleSignOut} startIcon={<LogOut />}>
            Sign Out
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            {currentView === 'dashboard' && (
              <>
                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h5" gutterBottom>
                      Welcome back, {user?.email}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Here's an overview of your tasks and activities
                    </Typography>
                  </Paper>
                </Grid>
                {renderTaskList()}
              </>
            )}
            {currentView === 'tasks' && renderTaskList()}
            {currentView === 'team' && renderUserList()}
          </Grid>
        </Container>
      </Box>

      {/* Create Task Dialog */}
      <Dialog open={openTaskDialog} onClose={() => setOpenTaskDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            fullWidth
            value={taskForm.title}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={taskForm.description}
            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Priority</InputLabel>
            <Select
              value={taskForm.priority}
              label="Priority"
              onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Assign To</InputLabel>
            <Select
              value={taskForm.assignedTo}
              label="Assign To"
              onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.fullName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTaskDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateTask} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}