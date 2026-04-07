// BlackieFi 3.0 - MongoDB Initialization Script
// This script runs on first MongoDB startup to initialize the database

// Switch to blackiefi database
db = db.getSiblingDB('blackiefi');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['id', 'email', 'hashed_password', 'full_name'],
      properties: {
        id: { bsonType: 'string' },
        email: { bsonType: 'string' },
        hashed_password: { bsonType: 'string' },
        full_name: { bsonType: 'string' },
        is_active: { bsonType: 'bool' },
        is_admin: { bsonType: 'bool' },
        created_at: { bsonType: 'string' },
        updated_at: { bsonType: 'string' }
      }
    }
  }
});

db.createCollection('entities');
db.createCollection('accounts');
db.createCollection('assets');
db.createCollection('transactions');
db.createCollection('status_checks');

// Create indexes
db.users.createIndex({ 'id': 1 }, { unique: true });
db.users.createIndex({ 'email': 1 }, { unique: true });
db.entities.createIndex({ 'id': 1 }, { unique: true });
db.entities.createIndex({ 'owner_id': 1 });
db.accounts.createIndex({ 'id': 1 }, { unique: true });
db.accounts.createIndex({ 'owner_id': 1 });
db.accounts.createIndex({ 'entity_id': 1 });
db.assets.createIndex({ 'id': 1 }, { unique: true });
db.assets.createIndex({ 'owner_id': 1 });
db.assets.createIndex({ 'entity_id': 1 });
db.transactions.createIndex({ 'id': 1 }, { unique: true });
db.transactions.createIndex({ 'user_id': 1 });
db.status_checks.createIndex({ 'id': 1 }, { unique: true });

print('BlackieFi database initialized successfully!');
