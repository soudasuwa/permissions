// Access control rules written in a single-level format.
// Each scenario exports an array of rule objects describing a resource, an
// action and the condition to evaluate.  The rule engine does not care which
// attributes exist in the context; it simply ensures that both the `resource`
// and `action` fields match before evaluating the rule condition.

const scenario1 = [
  {
    when: { resource: 'todo', action: 'create' },
    rule: {
      AND: [
        { 'user.id': { exists: true } },
        { 'item.ownerId': { reference: 'user.id' } }
      ]
    }
  },
  {
    when: { resource: 'todo', action: 'read' },
    rule: { 'item.ownerId': { reference: 'user.id' } }
  },
  {
    when: { resource: 'todo', action: 'update' },
    rule: { 'item.ownerId': { reference: 'user.id' } }
  },
  {
    when: { resource: 'todo', action: 'delete' },
    rule: { 'item.ownerId': { reference: 'user.id' } }
  }
];

const scenario2 = [
  {
    when: { resource: 'task', action: 'create' },
    rule: {
      AND: [
        { 'user.id': { exists: true } },
        { 'item.ownerId': { reference: 'user.id' } }
      ]
    }
  },
  {
    when: { resource: 'task', action: 'read' },
    rule: {
      OR: [
        { 'item.ownerId': { reference: 'user.id' } },
        { 'user.id': { in: { reference: 'item.sharedWith' } } }
      ]
    }
  },
  {
    when: { resource: 'task', action: 'update' },
    rule: {
      OR: [
        { 'item.ownerId': { reference: 'user.id' } },
        { 'user.id': { in: { reference: 'item.sharedWith' } } }
      ]
    }
  },
  {
    when: { resource: 'task', action: 'delete' },
    rule: { 'item.ownerId': { reference: 'user.id' } }
  }
];

const scenario3 = [
  {
    when: { resource: 'game', action: 'create' },
    rule: {
      AND: [
        { 'user.role': 'player' },
        { 'user.id': { in: { reference: 'item.participants' } } }
      ]
    }
  },
  {
    when: { resource: 'game', action: 'move' },
    rule: {
      AND: [
        { 'user.id': { in: { reference: 'item.participants' } } },
        { 'item.status': { not: 'complete' } }
      ]
    }
  },
  {
    when: { resource: 'game', action: 'read' },
    rule: {
      OR: [
        { 'item.status': 'complete' },
        {
          AND: [
            { 'user.id': { in: { reference: 'item.participants' } } },
            { 'item.status': { not: 'complete' } }
          ]
        }
      ]
    }
  },
  {
    when: { resource: 'leaderboard', action: 'read' },
    rule: { 'user.role': { in: ['player', 'moderator'] } }
  },
  {
    when: { resource: 'leaderboard', action: 'update' },
    rule: { 'user.role': 'moderator' }
  }
];

const scenario4 = [
  {
    when: { resource: 'note', action: 'create' },
    rule: {
      OR: [
        { 'notebook.ownerId': { reference: 'user.id' } },
        { 'user.id': { in: { reference: 'notebook.editors' } } }
      ]
    }
  },
  {
    when: { resource: 'note', action: 'read' },
    rule: {
      OR: [
        { 'notebook.ownerId': { reference: 'user.id' } },
        { 'user.id': { in: { reference: 'notebook.editors' } } },
        { 'user.id': { in: { reference: 'notebook.viewers' } } }
      ]
    }
  },
  {
    when: { resource: 'note', action: 'update' },
    rule: {
      OR: [
        { 'notebook.ownerId': { reference: 'user.id' } },
        { 'user.id': { in: { reference: 'notebook.editors' } } }
      ]
    }
  },
  {
    when: { resource: 'note', action: 'delete' },
    rule: {
      OR: [
        { 'notebook.ownerId': { reference: 'user.id' } },
        { 'user.id': { in: { reference: 'notebook.editors' } } }
      ]
    }
  },
  {
    when: { resource: 'notebook', action: 'delete' },
    rule: { 'notebook.ownerId': { reference: 'user.id' } }
  },
  {
    when: { resource: 'notebook', action: 'modifySharing' },
    rule: { 'notebook.ownerId': { reference: 'user.id' } }
  }
];

const scenario5 = [
  {
    when: { resource: 'category', action: 'view' },
    rule: {
      OR: [
        { 'category.isPrivate': { not: true } },
        { 'user.id': { in: { reference: 'category.allowedUsers' } } },
        { 'user.role': 'admin' }
      ]
    }
  },
  {
    when: { resource: 'topic', action: 'create' },
    rule: {
      AND: [
        { 'user.role': 'member' },
        {
          OR: [
            { 'category.isPrivate': { not: true } },
            { 'user.id': { in: { reference: 'category.allowedUsers' } } }
          ]
        }
      ]
    }
  },
  {
    when: { resource: 'post', action: 'editOwn' },
    rule: {
      AND: [
        { 'user.role': 'member' },
        { 'post.authorId': { reference: 'user.id' } },
        { 'post.ageMinutes': { lessThan: 30 } }
      ]
    }
  },
  {
    when: { resource: 'post', action: 'editAnyModerator' },
    rule: {
      AND: [
        { 'user.role': 'moderator' },
        { 'user.id': { in: { reference: 'category.moderators' } } }
      ]
    }
  },
  {
    when: { resource: 'user', action: 'adminDelete' },
    rule: { 'user.role': 'admin' }
  }
];

module.exports = { scenario1, scenario2, scenario3, scenario4, scenario5 };
