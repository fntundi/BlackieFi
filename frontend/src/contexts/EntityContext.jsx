import React, { createContext, useContext, useState } from 'react';

const EntityContext = createContext(null);

export function EntityProvider({ children }) {
  const [selectedEntityId, setSelectedEntityId] = useState(
    localStorage.getItem('blackiefi_entity') || null
  );

  const selectEntity = (entityId) => {
    setSelectedEntityId(entityId);
    if (entityId) {
      localStorage.setItem('blackiefi_entity', entityId);
    } else {
      localStorage.removeItem('blackiefi_entity');
    }
  };

  return (
    <EntityContext.Provider value={{ selectedEntityId, selectEntity }}>
      {children}
    </EntityContext.Provider>
  );
}

export function useEntity() {
  const context = useContext(EntityContext);
  if (!context) {
    throw new Error('useEntity must be used within an EntityProvider');
  }
  return context;
}
