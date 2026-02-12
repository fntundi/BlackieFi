import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admins can see all entities
    if (user.role === 'admin') {
      const allEntities = await base44.entities.Entity.list();
      return Response.json({
        success: true,
        entities: allEntities,
        is_admin: true
      });
    }

    // Get user's group memberships
    const groupMemberships = await base44.asServiceRole.entities.GroupMember.filter({
      user_email: user.email
    });

    if (groupMemberships.length === 0) {
      // User not in any groups - no access to entities
      return Response.json({
        success: true,
        entities: [],
        is_admin: false
      });
    }

    const groupIds = groupMemberships.map(gm => gm.group_id);

    // Get all entity access for user's groups
    const accessRecords = await base44.asServiceRole.entities.GroupEntityAccess.list();
    const accessibleEntityIds = [
      ...new Set(
        accessRecords
          .filter(ar => groupIds.includes(ar.group_id))
          .map(ar => ar.entity_id)
      )
    ];

    if (accessibleEntityIds.length === 0) {
      return Response.json({
        success: true,
        entities: [],
        is_admin: false
      });
    }

    // Fetch the actual entities
    const allEntities = await base44.entities.Entity.list();
    const accessibleEntities = allEntities.filter(e => 
      accessibleEntityIds.includes(e.id)
    );

    return Response.json({
      success: true,
      entities: accessibleEntities,
      is_admin: false
    });

  } catch (error) {
    console.error('Error getting accessible entities:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});