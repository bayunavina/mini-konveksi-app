"use strict";

/**
 * ESLint rule: ui-no-manual-size
 *
 * Melarang override tinggi/row-height komponen shadcn/ui lewat className manual.
 * Gunakan prop `size` resmi dari component variant (Button, SelectTrigger),
 * bukan class seperti `h-8 w-8`, `h-10`, `py-2.5`, `min-h-[44px]`, dst.
 *
 * Berlaku untuk pemakaian di app-level (`app/`, `components/`), bukan di
 * primitives `components/ui/*` yang memang mendefinisikan varian tsb.
 */
module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Use the official `size` prop of shadcn/ui components instead of manual height/padding className overrides.",
      recommended: false,
    },
    messages: {
      manual:
        "Jangan override ukuran komponen UI via className (`{{ tokens }}`). Gunakan prop `size` resmi dari component variant (mis. size=\"sm\", size=\"icon-lg\").",
    },
    schema: [],
  },
  create(context) {
    const NAMES = new Set(["Button", "SelectTrigger", "Input"]);

    function tokensToFlag(cls) {
      const found = [];
      // `data-[size=default]:h-10` style override pada SelectTrigger
      const dataRe = /(?:^|\s)data-\[size=[`'"]?[a-z]+[`'"]?\]:h-\d+/g;
      let m;
      while ((m = dataRe.exec(cls))) found.push(m[0].trim());
      // class tinggi/padding: h-*, h-auto, min-h-*, py-*, size-* (termasuk variant sm:/lg:)
      const re = /(?:^|\s)(?:[a-z]+:)?(?:min-)?h-\d+(?:\.\d+)?|(?:^|\s)(?:[a-z]+:)?(?:min-)?h-auto|(?:^|\s)(?:[a-z]+:)?py-\d+(?:\.\d+)?|(?:^|\s)size-\d+/g;
      while ((m = re.exec(cls))) found.push(m[0].trim());
      // dedupe, urut
      return Array.from(new Set(found)).sort();
    }

    return {
      JSXOpeningElement(node) {
        const name = node.name && node.name.name;
        if (!NAMES.has(name)) return;
        const classNameAttr = node.attributes.find(
          (a) =>
            a.type === "JSXAttribute" &&
            a.name &&
            a.name.type === "JSXIdentifier" &&
            a.name.name === "className"
        );
        if (!classNameAttr || !classNameAttr.value) return;
        // hanya string literal; lewati template literal / ekspresi
        if (classNameAttr.value.type !== "Literal") return;
        const cls = String(classNameAttr.value.value);
        const tokens = tokensToFlag(cls);
        if (tokens.length) {
          context.report({
            node: classNameAttr,
            messageId: "manual",
            data: { tokens: tokens.join(", ") },
          });
        }
      },
    };
  },
};