
import { storage } from './storage';

export async function initializeDatabase() {
  try {
    console.log('🌱 Initializing database with seed data...');

    // Check if data already exists
    const existingStores = await storage.getAllStores();
    if (existingStores.length > 0) {
      console.log('✅ Database already has data, skipping initialization');
      return;
    }

    // Create stores
    const stores = [
      { name: "Metro Mumbai Central", location: "Kamala Mills, Lower Parel, Mumbai", isActive: true },
      { name: "Metro Delhi Gurugram", location: "Sector 21, Gurugram, Haryana", isActive: true },
      { name: "Metro Bangalore Whitefield", location: "ITPL Road, Whitefield, Bangalore", isActive: true },
    ];

    const createdStores = [];
    for (const store of stores) {
      const created = await storage.createStore(store);
      createdStores.push(created);
      console.log(`✅ Created store: ${created.name}`);
    }

    // Create vendors
    const vendors = [
      { name: "Reliance Fresh", email: "vendor@reliancefresh.com", isActive: true },
      { name: "BigBasket", email: "vendor@bigbasket.com", isActive: true },
      { name: "Amazon Fresh", email: "vendor@amazonfresh.com", isActive: true },
    ];

    for (const vendor of vendors) {
      const created = await storage.createVendor(vendor);
      console.log(`✅ Created vendor: ${created.name}`);
    }

    // Create admin user
    await storage.createUser({
      username: "admin",
      password: "admin123",
      name: "Admin User",
      email: "admin@metro.com",
      role: "admin",
      storeId: null,
    });
    console.log('✅ Created admin user (admin/admin123)');

    // Create gate operator users
    for (let i = 0; i < createdStores.length; i++) {
      const store = createdStores[i];
      await storage.createUser({
        username: `operator${store.id}`,
        password: "operator123",
        name: `Gate Operator ${store.id}`,
        email: `operator${store.id}@metro.com`,
        role: "gate_operator",
        storeId: store.id,
      });
      console.log(`✅ Created gate operator: operator${store.id}/operator123`);
    }

    console.log('🎉 Database initialization completed successfully!');
    console.log('');
    console.log('📋 Test Credentials:');
    console.log('   Admin: admin / admin123');
    console.log('   Gate Operator: operator1 / operator123');
    console.log('   Gate Operator: operator2 / operator123');
    console.log('   Gate Operator: operator3 / operator123');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}
