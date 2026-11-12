import { describe, expect, it } from "vitest";
import messages from "../messages/da.json";
import { fillIn, operator } from "@/lib/operator";

/**
 * The privacy policy and terms exist only when an installation names who
 * runs it, and every gap in their texts is one the operator fills.
 */

const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;

describe("the operator of an installation", () => {
  it("is nobody until a name and a valid address to write to are set", () => {
    expect(operator(env({}))).toBeNull();
    expect(operator(env({ DISTIL_OPERATOR_NAME: "Firma" }))).toBeNull();
    expect(
      operator(env({ DISTIL_OPERATOR_NAME: "Firma", DISTIL_OPERATOR_EMAIL: "ikke en adresse" })),
    ).toBeNull();
    expect(
      operator(env({ DISTIL_OPERATOR_NAME: " Firma ", DISTIL_OPERATOR_EMAIL: "kontakt@firma.dk" })),
    ).toEqual({ name: "Firma", email: "kontakt@firma.dk", address: "", hosting: "" });
  });

  it("fills the gaps in a text", () => {
    const op = { name: "Firma", email: "kontakt@firma.dk", address: "Vej 1", hosting: "Udbyder" };
    expect(fillIn("{name}, {address}: {email} hos {hosting}. {name}", op)).toBe(
      "Firma, Vej 1: kontakt@firma.dk hos Udbyder. Firma",
    );
  });

  it("leaves no gap in the legal texts that nobody fills", () => {
    const known = new Set(["name", "email", "address", "hosting", "hostingSentence"]);
    const { privacy, terms, demoPrivacy, demoTerms } = messages.legal;
    const gaps = JSON.stringify({ privacy, terms, demoPrivacy, demoTerms })
      .match(/\{(\w+)\}/g)
      ?.map((g) => g.slice(1, -1));
    expect((gaps ?? []).filter((g) => !known.has(g))).toEqual([]);
  });
});
