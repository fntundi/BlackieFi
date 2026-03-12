// MongoDB initialization script for BlackieFi
// This script runs when the MongoDB container is first created

db = db.getSiblingDB('blackiefi');

// Create application user with appropriate permissions
db.createUser({
  user: 'blackiefi_app',
  pwd: 'blackiefi_app_password',
  roles: [
    {
      role: 'readWrite',
      db: 'blackiefi'
    }
  ]
});

// Create indexes for better performance
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.entities.createIndex({ "owner_id": 1 });
db.transactions.createIndex({ "entity_id": 1, "date": -1 });
db.accounts.createIndex({ "entity_id": 1 });
db.budgets.createIndex({ "entity_id": 1, "month": 1 });
db.assets.createIndex({ "entity_id": 1, "asset_type": 1 });

print('MongoDB initialization complete for BlackieFi');
