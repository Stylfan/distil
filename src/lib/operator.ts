/**
 * Who runs this installation for other people. An installation that hosts
 * accounts for others sets these, and gets a privacy policy and terms in
 * that operator's name; one run only for oneself leaves them out, and has
 * neither page. Read at request time, so a change needs no rebuild.
 */
export type Operator = {
  /** The company or person responsible: "Lenskjold Consulting". */
  name: string;
  /** Where people write about their data, their account or these terms. */
  email: string;
  /** Address and CVR number, as one line; may be empty. */
  address: string;
  /** Who runs the server and backups for the operator, e.g. "Hetzner Online GmbH i Tyskland". */
  hosting: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function operator(env: NodeJS.ProcessEnv = process.env): Operator | null {
  const name = env.DISTIL_OPERATOR_NAME?.trim() ?? "";
  const email = env.DISTIL_OPERATOR_EMAIL?.trim() ?? "";
  if (!name || !EMAIL.test(email)) return null;
  return {
    name,
    email,
    address: env.DISTIL_OPERATOR_ADDRESS?.trim() ?? "",
    hosting: env.DISTIL_HOSTING?.trim() ?? "",
  };
}

/** Puts the operator's details into a text from the messages, where it says {name} and the like. */
export function fillIn(text: string, op: Operator): string {
  return text
    .replaceAll("{name}", op.name)
    .replaceAll("{email}", op.email)
    .replaceAll("{address}", op.address)
    .replaceAll("{hosting}", op.hosting);
}
