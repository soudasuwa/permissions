/* Scenario 1: Simple ToDo App
   Roles: user
   Resources: todo items

   Access Controls:
   - Create: any authenticated user can create a todo item for themselves.
   - Read: a user may read only the todo items they created.
   - Update: a user may update only their own items.
   - Delete: a user may delete only their own items.
   - There is no access to other users' todo lists or individual items.
*/

/* Scenario 2: Friends Tasks App
   Roles: user
   Resources: tasks

   Access Controls:
   - Each user manages their own list of tasks.
   - A task may be shared with individual friends by username.
   - Create: a user may add new tasks to their list.
   - Read: the owner and any shared friend may view a task.
   - Update: the owner and shared friends may change the status or text of a shared task.
   - Delete: only the owner can delete a task from their list.
   - Unshared tasks remain completely private to their creator.
*/

/* Scenario 3: Tic-Tac-Toe Game with Leaderboard
   Roles: player, moderator
   Resources: games, leaderboard entries

   Access Controls:
   - Players may create a new game and invite one opponent.
   - During an active game only the two participants may make moves.
   - Completed games are read-only for all players.
   - Leaderboard entries are generated automatically from game results.
   - Players may read the leaderboard but cannot modify entries.
   - Moderators may update or reset leaderboard entries and review detailed game history for dispute resolution.
*/

/* Scenario 4: Collaborative Note Taking App
   Roles: owner, editor, viewer
   Resources: notebooks, notes

   Access Controls:
   - The owner of a notebook controls its sharing settings.
   - Create: owners and editors may create notes in a shared notebook.
   - Read: owners, editors, and viewers may read notes in notebooks shared with them.
   - Update: owners and editors may update any note in the notebook they have access to.
   - Delete: owners and editors may delete notes; only the owner may delete the entire notebook.
   - The owner is the only role allowed to modify sharing permissions or revoke access.
*/

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
