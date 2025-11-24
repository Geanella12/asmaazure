import React from 'react';

const UserTable = ({ users, onEdit, onDelete }) => {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Usuario</th>
            <th>Nombre</th>
            <th>Email</th>
            <th>DNI</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="6" className="no-data">No hay usuarios registrados</td>
            </tr>
          ) : (
            users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.dni}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      onClick={() => onEdit(user)}
                      className="btn-edit"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => onDelete(user.id)}
                      className="btn-delete"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;
