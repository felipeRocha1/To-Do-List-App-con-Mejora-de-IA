'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicializar Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Task {
  id: number;
  title: string;
  is_complete: boolean;
  user_email: string;
  created_at: string;
  enhanced_title?: string;
}

export default function TodoApp() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [userEmail, setUserEmail] = useState('demo@example.com');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // Obtener tareas al cargar el componente
  useEffect(() => {
    fetchTasks();
    
    // Configurar suscripción en tiempo real
    const channel = supabase
      .channel('tasks')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks' }, 
        () => fetchTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching tasks:', error);
    } else {
      setTasks(data || []);
    }
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ 
        title: newTask, 
        user_email: userEmail,
        is_complete: false 
      }])
      .select();
    
    if (error) {
      console.error('Error adding task:', error);
    } else {
      setNewTask('');
      
      // Llamar al webhook de n8n para mejorar la tarea
      if (data && data[0]) {
        fetch('/api/enhance-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            taskId: data[0].id, 
            title: newTask 
          }),
        });
      }
    }
  };

  const updateTask = async (id: number, updates: Partial<Task>) => {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (id: number) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting task:', error);
    }
  };

  const startEditing = (task: Task) => {
    setEditingId(task.id);
    setEditingText(task.enhanced_title || task.title);
  };

  const saveEditing = async () => {
    if (editingId !== null) {
      await updateTask(editingId, { 
        title: editingText,
        enhanced_title: null // Limpiar mejora de IA cuando el usuario edita
      });
      setEditingId(null);
      setEditingText('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Lista de Tareas con IA</h1>
        
        <div className="mb-4">
          <div className="flex mb-4">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTask()}
              placeholder="Añadir una nueva tarea..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addTask}
              className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Añadir
            </button>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email de usuario (para separación de datos)
            </label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`flex items-center p-3 rounded-md ${
                task.is_complete ? 'bg-green-50' : 'bg-white'
              } border border-gray-200`}
            >
              <input
                type="checkbox"
                checked={task.is_complete}
                onChange={() => updateTask(task.id, { is_complete: !task.is_complete })}
                className="h-5 w-5 text-blue-500 rounded focus:ring-blue-500"
              />
              
              <div className="flex-1 ml-3">
                {editingId === task.id ? (
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={saveEditing}
                    onKeyPress={(e) => e.key === 'Enter' && saveEditing()}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                ) : (
                  <div>
                    <span
                      className={`block ${task.is_complete ? 'line-through text-gray-500' : 'text-gray-800'}`}
                    >
                      {task.enhanced_title || task.title}
                    </span>
                    {task.enhanced_title && (
                      <span className="text-xs text-gray-500 block mt-1">
                        Original: {task.title}
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => startEditing(task)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  Editar
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
          
          {tasks.length === 0 && (
            <li className="text-center text-gray-500 py-4">
              No hay tareas aún. ¡Añade una arriba!
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
