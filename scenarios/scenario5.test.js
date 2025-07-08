/* Scenario 5: Discussion Forum
   Roles: guest, member, moderator, admin
   Resources: categories, topics, posts, attachments, user accounts

   Access Controls:
   - Guests
     - May browse public categories, topics, and posts.
     - May not create, vote, edit, or delete any content.
     - Cannot access private categories.

   - Members
     - May create topics and posts in categories they can access.
     - May edit or delete their own posts for 30 minutes after posting.
     - May upload attachments where allowed.
     - May send private messages to other members.
     - May report posts or topics for moderator review.
     - May vote on posts or topics if the feature exists.
     - Cannot modify other users' accounts or content.

   - Moderators
     - Assigned to specific categories.
     - May edit, lock, move, or delete any topic or post within their categories.
     - May manage user reports and remove inappropriate attachments.
     - May temporarily suspend or warn members in their categories.
     - Cannot change global site settings.

   - Admins
     - Full access to all categories, posts, and user accounts.
     - Manage categories, site configuration, and global permissions.
     - Assign or revoke moderator roles.
     - View, disable, or delete user accounts when necessary.
*/

const assert = require('node:assert');
const { test } = require('node:test');
const { authorize } = require('../ruleEngine');

const rules = [
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

module.exports = { rules };

// Tests

test('scenario5: guest cannot create topic', () => {
  const context = {
    resource: 'topic',
    action: 'create',
    user: { role: 'guest', id: 'g1' },
    category: { isPrivate: false }
  };
  assert.strictEqual(authorize(rules, context), false);
});

test('scenario5: member edits own recent post', () => {
  const context = {
    resource: 'post',
    action: 'editOwn',
    user: { role: 'member', id: 'm1' },
    post: { authorId: 'm1', ageMinutes: 10 }
  };
  assert.strictEqual(authorize(rules, context), true);
});

test('scenario5: moderator edits any post in category', () => {
  const context = {
    resource: 'post',
    action: 'editAnyModerator',
    user: { role: 'moderator', id: 'mod1' },
    category: { moderators: ['mod1'] }
  };
  assert.strictEqual(authorize(rules, context), true);
});

test('scenario5: guest cannot view private category', () => {
  const context = {
    resource: 'category',
    action: 'view',
    user: { role: 'guest', id: 'g1' },
    category: { isPrivate: true, allowedUsers: [] }
  };
  assert.strictEqual(authorize(rules, context), false);
});

test('scenario5: admin can delete user account', () => {
  const context = { resource: 'user', action: 'adminDelete', user: { role: 'admin' } };
  assert.strictEqual(authorize(rules, context), true);
});
