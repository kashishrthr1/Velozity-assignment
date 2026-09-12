import { PrismaClient, TaskStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export async function seedDatabase(force = false) {
  try {
    const existingUsers = await prisma.user.count();
    if (!force && existingUsers > 0) {
      console.log(`[Seed] Database already contains ${existingUsers} users. Skipping auto-seed.`);
      return;
    }

    console.log('🌱 [Seed] Seeding database with demo data...');

    if (force) {
      await prisma.activityFeed.deleteMany();
      await prisma.notification.deleteMany();
      await prisma.taskLog.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.task.deleteMany();
      await prisma.project.deleteMany();
      await prisma.client.deleteMany();
      await prisma.user.deleteMany();
    }

    // Hash passwords
    const adminHash = await bcrypt.hash('Admin@123', 12);
    const pmHash = await bcrypt.hash('PMpass@123', 12);
    const devHash = await bcrypt.hash('Devpass@123', 12);

    // ─── USERS ────────────────────────────────────────────────────────
    const admin = await prisma.user.create({
      data: { email: 'admin@velozity.com', passwordHash: adminHash, name: 'Alex Admin', role: 'ADMIN' },
    });

    const pm1 = await prisma.user.create({
      data: { email: 'pm1@velozity.com', passwordHash: pmHash, name: 'Priya Mehta', role: 'PROJECT_MANAGER' },
    });

    const pm2 = await prisma.user.create({
      data: { email: 'pm2@velozity.com', passwordHash: pmHash, name: 'Sam Torres', role: 'PROJECT_MANAGER' },
    });

    const dev1 = await prisma.user.create({
      data: { email: 'dev1@velozity.com', passwordHash: devHash, name: 'Ravi Kumar', role: 'DEVELOPER' },
    });

    const dev2 = await prisma.user.create({
      data: { email: 'dev2@velozity.com', passwordHash: devHash, name: 'Lena Schulz', role: 'DEVELOPER' },
    });

    const dev3 = await prisma.user.create({
      data: { email: 'dev3@velozity.com', passwordHash: devHash, name: 'Marcus Lee', role: 'DEVELOPER' },
    });

    const dev4 = await prisma.user.create({
      data: { email: 'dev4@velozity.com', passwordHash: devHash, name: 'Aisha Patel', role: 'DEVELOPER' },
    });

    console.log('✅ [Seed] Users created');

    // ─── CLIENTS ──────────────────────────────────────────────────────
    const client1 = await prisma.client.create({
      data: { name: 'John Smith', email: 'john@techcorp.com', phone: '+1-555-0101', company: 'TechCorp Inc' },
    });

    const client2 = await prisma.client.create({
      data: { name: 'Maria Garcia', email: 'maria@designstudio.com', phone: '+1-555-0202', company: 'Design Studio LLC' },
    });

    const client3 = await prisma.client.create({
      data: { name: 'David Chen', email: 'david@retailplus.com', phone: '+1-555-0303', company: 'RetailPlus' },
    });

    console.log('✅ [Seed] Clients created');

    // ─── PROJECTS ─────────────────────────────────────────────────────
    const now = new Date();
    const past = (days: number) => new Date(now.getTime() - days * 86400000);
    const future = (days: number) => new Date(now.getTime() + days * 86400000);

    const project1 = await prisma.project.create({
      data: {
        name: 'TechCorp Website Redesign',
        description: 'Full redesign of the TechCorp corporate website with modern UI/UX',
        status: 'ACTIVE',
        clientId: client1.id,
        createdById: pm1.id,
      },
    });

    const project2 = await prisma.project.create({
      data: {
        name: 'Design Studio Mobile App',
        description: 'React Native mobile app for Design Studio client portfolio',
        status: 'ACTIVE',
        clientId: client2.id,
        createdById: pm1.id,
      },
    });

    const project3 = await prisma.project.create({
      data: {
        name: 'RetailPlus E-commerce Platform',
        description: 'Custom e-commerce solution with inventory management',
        status: 'ACTIVE',
        clientId: client3.id,
        createdById: pm2.id,
      },
    });

    console.log('✅ [Seed] Projects created');

    // ─── TASKS ────────────────────────────────────────────────────────
    const task1_1 = await prisma.task.create({
      data: {
        title: 'Design homepage wireframes',
        description: 'Create low-fi and hi-fi wireframes for the new homepage layout',
        status: 'DONE',
        priority: 'HIGH',
        dueDate: past(10),
        isOverdue: false,
        projectId: project1.id,
        assignedToId: dev1.id,
        createdById: pm1.id,
      },
    });

    const task1_2 = await prisma.task.create({
      data: {
        title: 'Implement responsive navigation',
        description: 'Build mobile-first navigation component with hamburger menu',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: future(3),
        projectId: project1.id,
        assignedToId: dev1.id,
        createdById: pm1.id,
      },
    });

    const task1_3 = await prisma.task.create({
      data: {
        title: 'Set up CI/CD pipeline',
        description: 'Configure GitHub Actions for automated testing and deployment',
        status: 'IN_REVIEW',
        priority: 'MEDIUM',
        dueDate: future(5),
        projectId: project1.id,
        assignedToId: dev2.id,
        createdById: pm1.id,
      },
    });

    const task1_4 = await prisma.task.create({
      data: {
        title: 'Optimize image loading performance',
        description: 'Implement lazy loading and WebP conversion for all images',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: future(14),
        projectId: project1.id,
        assignedToId: dev2.id,
        createdById: pm1.id,
      },
    });

    const task1_5 = await prisma.task.create({
      data: {
        title: 'Write unit tests for auth module',
        description: 'Cover all authentication flows with comprehensive tests',
        status: 'TODO',
        priority: 'CRITICAL',
        dueDate: past(5),
        isOverdue: true,
        projectId: project1.id,
        assignedToId: dev1.id,
        createdById: pm1.id,
      },
    });

    const task1_6 = await prisma.task.create({
      data: {
        title: 'Integrate CMS for blog section',
        description: 'Connect headless CMS (Contentful) to the blog section',
        status: 'TODO',
        priority: 'LOW',
        dueDate: future(21),
        projectId: project1.id,
        assignedToId: dev3.id,
        createdById: pm1.id,
      },
    });

    const task2_1 = await prisma.task.create({
      data: {
        title: 'Set up React Native project',
        description: 'Initialize project with Expo, configure navigation and state management',
        status: 'DONE',
        priority: 'HIGH',
        dueDate: past(15),
        projectId: project2.id,
        assignedToId: dev3.id,
        createdById: pm1.id,
      },
    });

    const task2_2 = await prisma.task.create({
      data: {
        title: 'Build portfolio gallery screen',
        description: 'Create masonry grid gallery with image zoom and filtering',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: future(7),
        projectId: project2.id,
        assignedToId: dev3.id,
        createdById: pm1.id,
      },
    });

    const task2_3 = await prisma.task.create({
      data: {
        title: 'Implement push notifications',
        description: 'Set up FCM for iOS and Android push notifications',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: future(10),
        projectId: project2.id,
        assignedToId: dev4.id,
        createdById: pm1.id,
      },
    });

    const task2_4 = await prisma.task.create({
      data: {
        title: 'API integration for portfolio data',
        description: 'Connect mobile app to backend REST API for dynamic portfolio data',
        status: 'IN_PROGRESS',
        priority: 'CRITICAL',
        dueDate: past(3),
        isOverdue: true,
        projectId: project2.id,
        assignedToId: dev4.id,
        createdById: pm1.id,
      },
    });

    const task2_5 = await prisma.task.create({
      data: {
        title: 'App Store submission preparation',
        description: 'Prepare screenshots, descriptions, and metadata for App Store',
        status: 'TODO',
        priority: 'LOW',
        dueDate: future(30),
        projectId: project2.id,
        assignedToId: dev4.id,
        createdById: pm1.id,
      },
    });

    const task3_1 = await prisma.task.create({
      data: {
        title: 'Database schema design',
        description: 'Design PostgreSQL schema for products, orders, inventory',
        status: 'DONE',
        priority: 'CRITICAL',
        dueDate: past(20),
        projectId: project3.id,
        assignedToId: dev2.id,
        createdById: pm2.id,
      },
    });

    const task3_2 = await prisma.task.create({
      data: {
        title: 'Product catalog API',
        description: 'RESTful API for product CRUD with search and filtering',
        status: 'IN_REVIEW',
        priority: 'HIGH',
        dueDate: future(2),
        projectId: project3.id,
        assignedToId: dev2.id,
        createdById: pm2.id,
      },
    });

    const task3_3 = await prisma.task.create({
      data: {
        title: 'Shopping cart implementation',
        description: 'Cart state management with persistent storage and coupon support',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: future(8),
        projectId: project3.id,
        assignedToId: dev1.id,
        createdById: pm2.id,
      },
    });

    const task3_4 = await prisma.task.create({
      data: {
        title: 'Payment gateway integration',
        description: 'Stripe integration for secure checkout with 3DS support',
        status: 'TODO',
        priority: 'CRITICAL',
        dueDate: future(12),
        projectId: project3.id,
        assignedToId: dev2.id,
        createdById: pm2.id,
      },
    });

    const task3_5 = await prisma.task.create({
      data: {
        title: 'Admin inventory dashboard',
        description: 'Real-time inventory tracking with low-stock alerts',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: future(18),
        projectId: project3.id,
        assignedToId: dev3.id,
        createdById: pm2.id,
      },
    });

    const task3_6 = await prisma.task.create({
      data: {
        title: 'Order management system',
        description: 'Order tracking with email notifications and status updates',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: future(22),
        projectId: project3.id,
        assignedToId: dev4.id,
        createdById: pm2.id,
      },
    });

    console.log('✅ [Seed] Tasks created (including 2 overdue)');

    // ─── TASK LOGS ────────────────────────────────────────────────────
    const taskLogData = [
      { taskId: task1_1.id, changedById: pm1.id, oldStatus: null, newStatus: 'TODO' as TaskStatus, note: 'Task created' },
      { taskId: task1_1.id, changedById: dev1.id, oldStatus: 'TODO' as TaskStatus, newStatus: 'IN_PROGRESS' as TaskStatus },
      { taskId: task1_1.id, changedById: dev1.id, oldStatus: 'IN_PROGRESS' as TaskStatus, newStatus: 'IN_REVIEW' as TaskStatus },
      { taskId: task1_1.id, changedById: pm1.id, oldStatus: 'IN_REVIEW' as TaskStatus, newStatus: 'DONE' as TaskStatus },
      { taskId: task1_2.id, changedById: pm1.id, oldStatus: null, newStatus: 'TODO' as TaskStatus, note: 'Task created' },
      { taskId: task1_2.id, changedById: dev1.id, oldStatus: 'TODO' as TaskStatus, newStatus: 'IN_PROGRESS' as TaskStatus },
      { taskId: task1_3.id, changedById: pm1.id, oldStatus: null, newStatus: 'TODO' as TaskStatus, note: 'Task created' },
      { taskId: task1_3.id, changedById: dev2.id, oldStatus: 'TODO' as TaskStatus, newStatus: 'IN_PROGRESS' as TaskStatus },
      { taskId: task1_3.id, changedById: dev2.id, oldStatus: 'IN_PROGRESS' as TaskStatus, newStatus: 'IN_REVIEW' as TaskStatus },
      { taskId: task2_1.id, changedById: pm1.id, oldStatus: null, newStatus: 'TODO' as TaskStatus, note: 'Task created' },
      { taskId: task2_1.id, changedById: dev3.id, oldStatus: 'TODO' as TaskStatus, newStatus: 'IN_PROGRESS' as TaskStatus },
      { taskId: task2_1.id, changedById: dev3.id, oldStatus: 'IN_PROGRESS' as TaskStatus, newStatus: 'DONE' as TaskStatus },
      { taskId: task3_1.id, changedById: pm2.id, oldStatus: null, newStatus: 'TODO' as TaskStatus, note: 'Task created' },
      { taskId: task3_1.id, changedById: dev2.id, oldStatus: 'TODO' as TaskStatus, newStatus: 'IN_PROGRESS' as TaskStatus },
      { taskId: task3_1.id, changedById: dev2.id, oldStatus: 'IN_PROGRESS' as TaskStatus, newStatus: 'DONE' as TaskStatus },
    ];

    for (const log of taskLogData) {
      await prisma.taskLog.create({ data: log });
    }

    console.log('✅ [Seed] Task logs created');

    // ─── ACTIVITY FEED ────────────────────────────────────────────────
    const activityData = [
      { projectId: project1.id, userId: pm1.id, taskId: task1_1.id, actionType: 'TASK_CREATED', message: 'Priya Mehta created task "Design homepage wireframes" in TechCorp Website Redesign', createdAt: past(20) },
      { projectId: project1.id, userId: dev1.id, taskId: task1_1.id, actionType: 'STATUS_CHANGED', message: 'Ravi Kumar moved "Design homepage wireframes" from To Do → In Progress in TechCorp Website Redesign', createdAt: past(18) },
      { projectId: project1.id, userId: dev1.id, taskId: task1_1.id, actionType: 'STATUS_CHANGED', message: 'Ravi Kumar moved "Design homepage wireframes" from In Progress → In Review in TechCorp Website Redesign', createdAt: past(12) },
      { projectId: project1.id, userId: pm1.id, taskId: task1_1.id, actionType: 'STATUS_CHANGED', message: 'Priya Mehta moved "Design homepage wireframes" from In Review → Done in TechCorp Website Redesign', createdAt: past(10) },
      { projectId: project1.id, userId: pm1.id, taskId: task1_2.id, actionType: 'TASK_CREATED', message: 'Priya Mehta created task "Implement responsive navigation" in TechCorp Website Redesign', createdAt: past(8) },
      { projectId: project1.id, userId: dev1.id, taskId: task1_2.id, actionType: 'STATUS_CHANGED', message: 'Ravi Kumar moved "Implement responsive navigation" from To Do → In Progress in TechCorp Website Redesign', createdAt: past(5) },
      { projectId: project1.id, userId: pm1.id, taskId: task1_3.id, actionType: 'TASK_CREATED', message: 'Priya Mehta created task "Set up CI/CD pipeline" in TechCorp Website Redesign', createdAt: past(7) },
      { projectId: project1.id, userId: dev2.id, taskId: task1_3.id, actionType: 'STATUS_CHANGED', message: 'Lena Schulz moved "Set up CI/CD pipeline" from In Progress → In Review in TechCorp Website Redesign', createdAt: past(2) },
      { projectId: project2.id, userId: pm1.id, taskId: task2_1.id, actionType: 'TASK_CREATED', message: 'Priya Mehta created task "Set up React Native project" in Design Studio Mobile App', createdAt: past(16) },
      { projectId: project2.id, userId: dev3.id, taskId: task2_1.id, actionType: 'STATUS_CHANGED', message: 'Marcus Lee moved "Set up React Native project" from To Do → In Progress in Design Studio Mobile App', createdAt: past(14) },
      { projectId: project2.id, userId: dev3.id, taskId: task2_1.id, actionType: 'STATUS_CHANGED', message: 'Marcus Lee moved "Set up React Native project" from In Progress → Done in Design Studio Mobile App', createdAt: past(13) },
      { projectId: project3.id, userId: pm2.id, taskId: task3_1.id, actionType: 'TASK_CREATED', message: 'Sam Torres created task "Database schema design" in RetailPlus E-commerce Platform', createdAt: past(25) },
      { projectId: project3.id, userId: dev2.id, taskId: task3_1.id, actionType: 'STATUS_CHANGED', message: 'Lena Schulz moved "Database schema design" from In Progress → Done in RetailPlus E-commerce Platform', createdAt: past(20) },
      { projectId: project3.id, userId: pm2.id, taskId: task3_2.id, actionType: 'TASK_CREATED', message: 'Sam Torres created task "Product catalog API" in RetailPlus E-commerce Platform', createdAt: past(10) },
      { projectId: project3.id, userId: dev2.id, taskId: task3_2.id, actionType: 'STATUS_CHANGED', message: 'Lena Schulz moved "Product catalog API" from In Progress → In Review in RetailPlus E-commerce Platform', createdAt: past(1) },
    ];

    for (const activity of activityData) {
      await prisma.activityFeed.create({ data: activity });
    }

    console.log('✅ [Seed] Activity feed seeded');

    // ─── NOTIFICATIONS ────────────────────────────────────────────────
    await prisma.notification.createMany({
      data: [
        { userId: dev1.id, taskId: task1_2.id, message: 'You have been assigned to task "Implement responsive navigation" in project "TechCorp Website Redesign"', isRead: false },
        { userId: dev1.id, taskId: task1_5.id, message: 'You have been assigned to task "Write unit tests for auth module" in project "TechCorp Website Redesign"', isRead: true },
        { userId: dev2.id, taskId: task3_2.id, message: 'You have been assigned to task "Product catalog API" in project "RetailPlus E-commerce Platform"', isRead: false },
        { userId: pm1.id, taskId: task1_3.id, message: 'Task "Set up CI/CD pipeline" in "TechCorp Website Redesign" has been moved to In Review', isRead: false },
        { userId: pm2.id, taskId: task3_2.id, message: 'Task "Product catalog API" in "RetailPlus E-commerce Platform" has been moved to In Review', isRead: false },
        { userId: dev4.id, taskId: task2_4.id, message: 'You have been assigned to task "API integration for portfolio data" in project "Design Studio Mobile App"', isRead: false },
      ],
    });

    console.log('✅ [Seed] Notifications seeded');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Seed complete! Demo credentials:');
    console.log('   Admin:   admin@velozity.com  /  Admin@123');
    console.log('   PM 1:    pm1@velozity.com    /  PMpass@123');
    console.log('   PM 2:    pm2@velozity.com    /  PMpass@123');
    console.log('   Dev 1:   dev1@velozity.com   /  Devpass@123');
    console.log('   Dev 2:   dev2@velozity.com   /  Devpass@123');
    console.log('   Dev 3:   dev3@velozity.com   /  Devpass@123');
    console.log('   Dev 4:   dev4@velozity.com   /  Devpass@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('[Seed Error]:', error);
  }
}
