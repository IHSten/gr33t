const BODY_READERS = new Set([
  "json",
  "formData",
  "arrayBuffer",
  "text",
  "blob",
]);

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require request bodies to be read through a validating helper, not raw c.req.json()/formData()/etc.",
    },
    schema: [],
    messages: {
      raw: "Raw request body read `.req.{{name}}()` is not allowed here. Read + validate via parseJsonBody(c, schema) from worker/src/validate.ts so the input is checked before use.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression") return;
        const prop = callee.property;
        if (prop.type !== "Identifier" || !BODY_READERS.has(prop.name)) return;
        const obj = callee.object;
        if (
          obj.type !== "MemberExpression" ||
          obj.property.type !== "Identifier" ||
          obj.property.name !== "req"
        ) {
          return;
        }
        context.report({ node, messageId: "raw", data: { name: prop.name } });
      },
    };
  },
};
