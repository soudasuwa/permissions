// Access control rules derived from scenarios.js with grouped resources

const scenario1 = {
  todo: {
    create: { AND: [ { 'user.id': { exists: true } }, { 'resource.ownerId': { reference: 'user.id' } } ] },
    read:   { 'resource.ownerId': { reference: 'user.id' } },
    update: { 'resource.ownerId': { reference: 'user.id' } },
    delete: { 'resource.ownerId': { reference: 'user.id' } }
  }
};

const scenario2 = {
  task: {
    create: { AND: [ { 'user.id': { exists: true } }, { 'resource.ownerId': { reference: 'user.id' } } ] },
    read: {
      OR: [
        { 'resource.ownerId': { reference: 'user.id' } },
        { 'user.id': { in: { reference: 'resource.sharedWith' } } }
      ]
    },
    update: {
      OR: [
        { 'resource.ownerId': { reference: 'user.id' } },
        { 'user.id': { in: { reference: 'resource.sharedWith' } } }
      ]
    },
    delete: { 'resource.ownerId': { reference: 'user.id' } }
  }
};

const scenario3 = {
  game: {
    create: {
      AND: [
        { 'user.role': 'player' },
        { 'user.id': { in: { reference: 'resource.participants' } } }
      ]
    },
    move: {
      AND: [
        { 'user.id': { in: { reference: 'resource.participants' } } },
        { 'resource.status': { not: 'complete' } }
      ]
    },
    read: {
      OR: [
        { 'resource.status': 'complete' },
        {
          AND: [
            { 'user.id': { in: { reference: 'resource.participants' } } },
            { 'resource.status': { not: 'complete' } }
          ]
        }
      ]
    }
  },
  leaderboard: {
    read: { 'user.role': { in: ['player', 'moderator'] } },
    update: { 'user.role': 'moderator' }
  }
};

const scenario4 = {
  note: {
    create: {
      OR: [
        { 'notebook.ownerId': { reference: 'user.id' } },
        { 'user.id': { in: { reference: 'notebook.editors' } } }
      ]
    },
    read: {
      OR: [
        { 'notebook.ownerId': { reference: 'user.id' } },
        { 'user.id': { in: { reference: 'notebook.editors' } } },
        { 'user.id': { in: { reference: 'notebook.viewers' } } }
      ]
    },
    update: {
      OR: [
        { 'notebook.ownerId': { reference: 'user.id' } },
        { 'user.id': { in: { reference: 'notebook.editors' } } }
      ]
    },
    delete: {
      OR: [
        { 'notebook.ownerId': { reference: 'user.id' } },
        { 'user.id': { in: { reference: 'notebook.editors' } } }
      ]
    }
  },
  notebook: {
    delete: { 'notebook.ownerId': { reference: 'user.id' } },
    modifySharing: { 'notebook.ownerId': { reference: 'user.id' } }
  }
};

const scenario5 = {
  category: {
    view: {
      OR: [
        { 'category.isPrivate': { not: true } },
        { 'user.id': { in: { reference: 'category.allowedUsers' } } },
        { 'user.role': 'admin' }
      ]
    }
  },
  topic: {
    create: {
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
  post: {
    editOwn: {
      AND: [
        { 'user.role': 'member' },
        { 'post.authorId': { reference: 'user.id' } },
        { 'post.ageMinutes': { lessThan: 30 } }
      ]
    },
    editAnyModerator: {
      AND: [
        { 'user.role': 'moderator' },
        { 'user.id': { in: { reference: 'category.moderators' } } }
      ]
    }
  },
  user: {
    adminDelete: { 'user.role': 'admin' }
  }
};

module.exports = { scenario1, scenario2, scenario3, scenario4, scenario5 };
