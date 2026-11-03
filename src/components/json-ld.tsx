/**
 * schema.org data for search engines and AI answers (builders in
 * src/lib/seo.ts). `<` is escaped so text from the database can't close the
 * script tag.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
