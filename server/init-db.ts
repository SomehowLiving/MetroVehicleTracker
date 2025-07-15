
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

    // Create 20 stores across different cities
    const stores = [
      { name: "Metro Mumbai Central", location: "Kamala Mills, Lower Parel, Mumbai", isActive: true },
      { name: "Metro Delhi Gurugram", location: "Sector 21, Gurugram, Haryana", isActive: true },
      { name: "Metro Bangalore Whitefield", location: "ITPL Road, Whitefield, Bangalore", isActive: true },
      { name: "Metro Chennai OMR", location: "Old Mahabalipuram Road, Chennai", isActive: true },
      { name: "Metro Hyderabad Gachibowli", location: "Gachibowli, Hyderabad", isActive: true },
      { name: "Metro Pune Hinjewadi", location: "Hinjewadi Phase 1, Pune", isActive: true },
      { name: "Metro Kolkata Salt Lake", location: "Salt Lake City, Kolkata", isActive: true },
      { name: "Metro Ahmedabad Bopal", location: "Bopal, Ahmedabad", isActive: true },
      { name: "Metro Jaipur Malviya Nagar", location: "Malviya Nagar, Jaipur", isActive: true },
      { name: "Metro Lucknow Gomti Nagar", location: "Gomti Nagar, Lucknow", isActive: true },
      { name: "Metro Bhubaneswar Patia", location: "Patia, Bhubaneswar", isActive: true },
      { name: "Metro Coimbatore Peelamedu", location: "Peelamedu, Coimbatore", isActive: true },
      { name: "Metro Kochi Kakkanad", location: "Kakkanad, Kochi", isActive: true },
      { name: "Metro Indore Vijay Nagar", location: "Vijay Nagar, Indore", isActive: true },
      { name: "Metro Nagpur Wardha Road", location: "Wardha Road, Nagpur", isActive: true },
      { name: "Metro Vadodara Alkapuri", location: "Alkapuri, Vadodara", isActive: true },
      { name: "Metro Chandigarh Sector 34", location: "Sector 34, Chandigarh", isActive: true },
      { name: "Metro Visakhapatnam Dwaraka", location: "Dwaraka Nagar, Visakhapatnam", isActive: true },
      { name: "Metro Thiruvananthapuram Technopark", location: "Technopark, Thiruvananthapuram", isActive: true },
      { name: "Metro Guwahati Paltan Bazaar", location: "Paltan Bazaar, Guwahati", isActive: true }
    ];

    const createdStores = [];
    for (const store of stores) {
      const created = await storage.createStore(store);
      createdStores.push(created);
      console.log(`✅ Created store: ${created.name}`);
    }

    // Create 15 vendors
    const vendors = [
      { name: "Reliance Fresh", email: "vendor@reliancefresh.com", isActive: true },
      { name: "BigBasket", email: "vendor@bigbasket.com", isActive: true },
      { name: "Amazon Fresh", email: "vendor@amazonfresh.com", isActive: true },
      { name: "Grofers (Blinkit)", email: "vendor@blinkit.com", isActive: true },
      { name: "Swiggy Instamart", email: "vendor@swiggy.com", isActive: true },
      { name: "Zomato Market", email: "vendor@zomato.com", isActive: true },
      { name: "Spencer's Retail", email: "vendor@spencers.com", isActive: true },
      { name: "More Supermarket", email: "vendor@more.com", isActive: true },
      { name: "FreshToHome", email: "vendor@freshtohome.com", isActive: true },
      { name: "Licious", email: "vendor@licious.com", isActive: true },
      { name: "Country Delight", email: "vendor@countrydelight.com", isActive: true },
      { name: "Milk Basket", email: "vendor@milkbasket.com", isActive: true },
      { name: "ID Fresh Food", email: "vendor@idfresh.com", isActive: true },
      { name: "Natures Basket", email: "vendor@naturesbasket.com", isActive: true },
      { name: "Foodhall", email: "vendor@foodhall.com", isActive: true }
    ];

    const createdVendors = [];
    for (const vendor of vendors) {
      const created = await storage.createVendor(vendor);
      createdVendors.push(created);
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

    // Create gate operator and FSD users for first 10 stores
    for (let i = 0; i < Math.min(10, createdStores.length); i++) {
      const store = createdStores[i];
      
      // Gate operator
      await storage.createUser({
        username: `op${String(i + 1).padStart(2, '0')}`,
        password: "123",
        name: `Gate Operator ${store.name}`,
        email: `op${String(i + 1).padStart(2, '0')}@metro.com`,
        role: "gate-operator",
        storeId: store.id,
      });
      console.log(`✅ Created gate operator: op${String(i + 1).padStart(2, '0')}/123`);

      // FSD supervisor
      await storage.createUser({
        username: `fsd${String(i + 1).padStart(2, '0')}`,
        password: "123",
        name: `FSD Supervisor ${store.name}`,
        email: `fsd${String(i + 1).padStart(2, '0')}@metro.com`,
        role: "fsd",
        storeId: store.id,
      });
      console.log(`✅ Created FSD supervisor: fsd${String(i + 1).padStart(2, '0')}/123`);
    }

    // Create 20 vehicles with realistic data
    const vehicleData = [
      { number: "MH01AB1234", driver: "Rajesh Kumar", aadhaar: "123456789012", vendorIndex: 0 },
      { number: "DL02CD5678", driver: "Amit Singh", aadhaar: "234567890123", vendorIndex: 1 },
      { number: "KA03EF9012", driver: "Suresh Reddy", aadhaar: "345678901234", vendorIndex: 2 },
      { number: "TN04GH3456", driver: "Murugan Tamil", aadhaar: "456789012345", vendorIndex: 3 },
      { number: "AP05IJ7890", driver: "Venkat Rao", aadhaar: "567890123456", vendorIndex: 4 },
      { number: "MH06KL1234", driver: "Prakash Sharma", aadhaar: "678901234567", vendorIndex: 5 },
      { number: "WB07MN5678", driver: "Debashish Roy", aadhaar: "789012345678", vendorIndex: 6 },
      { number: "GJ08OP9012", driver: "Kiran Patel", aadhaar: "890123456789", vendorIndex: 7 },
      { number: "RJ09QR3456", driver: "Mahesh Gupta", aadhaar: "901234567890", vendorIndex: 8 },
      { number: "UP10ST7890", driver: "Ramesh Yadav", aadhaar: "012345678901", vendorIndex: 9 },
      { number: "OR11UV1234", driver: "Santosh Nayak", aadhaar: "123450987654", vendorIndex: 10 },
      { number: "TN12WX5678", driver: "Ravi Krishnan", aadhaar: "234561098765", vendorIndex: 11 },
      { number: "KL13YZ9012", driver: "Anoop Nair", aadhaar: "345672109876", vendorIndex: 12 },
      { number: "MP14AB3456", driver: "Dinesh Tiwari", aadhaar: "456783210987", vendorIndex: 13 },
      { number: "MH15CD7890", driver: "Sachin Patil", aadhaar: "567894321098", vendorIndex: 14 },
      { number: "GJ16EF1234", driver: "Hitesh Shah", aadhaar: "678905432109", vendorIndex: 0 },
      { number: "PB17GH5678", driver: "Harpreet Singh", aadhaar: "789016543210", vendorIndex: 1 },
      { number: "AS18IJ9012", driver: "Bijoy Sarma", aadhaar: "890127654321", vendorIndex: 2 },
      { number: "KA19KL3456", driver: "Naveen Kumar", aadhaar: "901238765432", vendorIndex: 3 },
      { number: "TN20MN7890", driver: "Ganesh Babu", aadhaar: "012349876543", vendorIndex: 4 }
    ];

    const createdVehicles = [];
    for (const vehicle of vehicleData) {
      const created = await storage.createVehicle({
        vehicleNumber: vehicle.number,
        vendorId: createdVendors[vehicle.vendorIndex].id,
        driverName: vehicle.driver,
        driverAadhaarNumber: vehicle.aadhaar,
        driverPhotoUrl: null
      });
      createdVehicles.push(created);
      console.log(`✅ Created vehicle: ${created.vehicleNumber} - ${created.driverName}`);
    }

    // Create vendor supervisors (2 per vendor for first 10 vendors)
    const supervisorData = [
      { name: "Pradeep Supervisor", aadhaar: "111222333444", phone: "9876543210" },
      { name: "Sunil Manager", aadhaar: "222333444555", phone: "9765432109" },
      { name: "Deepak Lead", aadhaar: "333444555666", phone: "9654321098" },
      { name: "Vikram Chief", aadhaar: "444555666777", phone: "9543210987" },
      { name: "Anil Head", aadhaar: "555666777888", phone: "9432109876" },
      { name: "Manoj Senior", aadhaar: "666777888999", phone: "9321098765" },
      { name: "Rahul Supervisor", aadhaar: "777888999000", phone: "9210987654" },
      { name: "Ashok Manager", aadhaar: "888999000111", phone: "9109876543" },
      { name: "Vinod Lead", aadhaar: "999000111222", phone: "9098765432" },
      { name: "Raman Chief", aadhaar: "000111222333", phone: "9987654321" },
      { name: "Sanjay Head", aadhaar: "111222333445", phone: "9876543211" },
      { name: "Ajay Senior", aadhaar: "222333444556", phone: "9765432110" },
      { name: "Rohit Supervisor", aadhaar: "333444555667", phone: "9654321099" },
      { name: "Nitin Manager", aadhaar: "444555666778", phone: "9543210988" },
      { name: "Gaurav Lead", aadhaar: "555666777889", phone: "9432109877" },
      { name: "Abhishek Chief", aadhaar: "666777888990", phone: "9321098766" },
      { name: "Pankaj Head", aadhaar: "777888999001", phone: "9210987655" },
      { name: "Shyam Senior", aadhaar: "888999000112", phone: "9109876544" },
      { name: "Gopal Supervisor", aadhaar: "999000111223", phone: "9098765433" },
      { name: "Mohan Manager", aadhaar: "000111222334", phone: "9987654322" }
    ];

    for (let i = 0; i < Math.min(20, supervisorData.length); i++) {
      const supervisor = supervisorData[i];
      const vendorIndex = i % createdVendors.length;
      const storeIndex = i % createdStores.length;
      
      await storage.createVendorSupervisor({
        vendorId: createdVendors[vendorIndex].id,
        storeId: createdStores[storeIndex].id,
        name: supervisor.name,
        aadhaarNumber: supervisor.aadhaar,
        phoneNumber: supervisor.phone,
        photoUrl: null,
        isActive: true
      });
      console.log(`✅ Created vendor supervisor: ${supervisor.name}`);
    }

    // Create vendor loaders (3 per vendor for first 10 vendors)
    const loaderData = [
      { name: "Ramesh Loader", aadhaar: "123123123123", phone: "8876543210" },
      { name: "Suresh Helper", aadhaar: "234234234234", phone: "8765432109" },
      { name: "Mahesh Worker", aadhaar: "345345345345", phone: "8654321098" },
      { name: "Dinesh Loader", aadhaar: "456456456456", phone: "8543210987" },
      { name: "Rakesh Helper", aadhaar: "567567567567", phone: "8432109876" },
      { name: "Naresh Worker", aadhaar: "678678678678", phone: "8321098765" },
      { name: "Umesh Loader", aadhaar: "789789789789", phone: "8210987654" },
      { name: "Kamlesh Helper", aadhaar: "890890890890", phone: "8109876543" },
      { name: "Jignesh Worker", aadhaar: "901901901901", phone: "8098765432" },
      { name: "Hitesh Loader", aadhaar: "012012012012", phone: "8987654321" },
      { name: "Ritesh Helper", aadhaar: "123123123124", phone: "8876543211" },
      { name: "Nitesh Worker", aadhaar: "234234234235", phone: "8765432110" },
      { name: "Mitesh Loader", aadhaar: "345345345346", phone: "8654321099" },
      { name: "Kalpesh Helper", aadhaar: "456456456457", phone: "8543210988" },
      { name: "Alpesh Worker", aadhaar: "567567567568", phone: "8432109877" },
      { name: "Paresh Loader", aadhaar: "678678678679", phone: "8321098766" },
      { name: "Haresh Helper", aadhaar: "789789789780", phone: "8210987655" },
      { name: "Bharesh Worker", aadhaar: "890890890891", phone: "8109876544" },
      { name: "Chirag Loader", aadhaar: "901901901902", phone: "8098765433" },
      { name: "Dhiraj Helper", aadhaar: "012012012013", phone: "8987654322" },
      { name: "Niraj Worker", aadhaar: "123123123125", phone: "8876543212" },
      { name: "Siraj Loader", aadhaar: "234234234236", phone: "8765432111" },
      { name: "Raj Helper", aadhaar: "345345345347", phone: "8654321100" },
      { name: "Yash Worker", aadhaar: "456456456458", phone: "8543210989" },
      { name: "Arjun Loader", aadhaar: "567567567569", phone: "8432109878" },
      { name: "Varun Helper", aadhaar: "678678678680", phone: "8321098767" },
      { name: "Tarun Worker", aadhaar: "789789789781", phone: "8210987656" },
      { name: "Arun Loader", aadhaar: "890890890892", phone: "8109876545" },
      { name: "Kiran Helper", aadhaar: "901901901903", phone: "8098765434" },
      { name: "Pavan Worker", aadhaar: "012012012014", phone: "8987654323" }
    ];

    for (let i = 0; i < Math.min(30, loaderData.length); i++) {
      const loader = loaderData[i];
      const vendorIndex = i % createdVendors.length;
      const storeIndex = i % createdStores.length;
      
      await storage.createVendorLoader({
        vendorId: createdVendors[vendorIndex].id,
        storeId: createdStores[storeIndex].id,
        name: loader.name,
        aadhaarNumber: loader.aadhaar,
        phoneNumber: loader.phone,
        photoUrl: null,
        isActive: true
      });
      console.log(`✅ Created vendor loader: ${loader.name}`);
    }

    // Create some realistic check-ins (15 active check-ins)
    const purposes = [
      "Delivery of fresh vegetables",
      "Grocery supply drop",
      "Frozen food delivery",
      "Dairy products supply",
      "Meat and seafood delivery",
      "Bakery items supply",
      "Beverages delivery",
      "Household items supply",
      "Personal care products",
      "Electronics delivery",
      "Clothing supply",
      "Books and stationery",
      "Sports equipment",
      "Pharmacy supplies",
      "Home appliances"
    ];

    for (let i = 0; i < 15; i++) {
      const vehicle = createdVehicles[i];
      const store = createdStores[i % createdStores.length];
      const vendor = createdVendors.find(v => v.id === vehicle.vendorId);
      
      await storage.createCheckin({
        vehicleId: vehicle.id,
        storeId: store.id,
        vendorId: vehicle.vendorId,
        operatorId: 2, // First gate operator
        purpose: purposes[i],
        openingKm: Math.floor(Math.random() * 50000) + 10000,
        openingKmTimestamp: new Date(),
        closingKm: null,
        closingKmTimestamp: null,
        isFraudulent: false,
        fraudFlags: null,
        fraudNotes: null,
        status: "active",
        vehicleNumber: vehicle.vehicleNumber,
        vendorName: vendor.name,
        driverName: vehicle.driverName,
        storeName: store.name
      });
      console.log(`✅ Created check-in for vehicle: ${vehicle.vehicleNumber}`);
    }

    console.log('🎉 Database initialization completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   🏪 ${createdStores.length} stores created`);
    console.log(`   🏢 ${createdVendors.length} vendors created`);
    console.log(`   🚛 ${createdVehicles.length} vehicles created`);
    console.log(`   👥 20 supervisors created`);
    console.log(`   👷 30 loaders created`);
    console.log(`   📋 15 active check-ins created`);
    console.log('');
    console.log('📋 Test Credentials:');
    console.log('   Admin: admin / admin123');
    console.log('   Gate Operators: op01-op10 / 123');
    console.log('   FSD Supervisors: fsd01-fsd10 / 123');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}
