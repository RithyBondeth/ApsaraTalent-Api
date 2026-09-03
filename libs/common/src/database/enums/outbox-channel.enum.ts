/**
 * Delivery channels the outbox can dispatch.
 *
 * Stored as a plain varchar rather than a Postgres enum type — see the note in
 * `1786500012000-AddOutboxMessages`. Two migrations in this repo are already
 * permanently irreversible because they added a value to an enum type, and a
 * queue's channel list is the column most likely to grow.
 */
export enum EOutboxChannel {
  EMAIL = 'email',
}
