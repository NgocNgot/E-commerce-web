import { generateMetadata } from "./metadata"; // Use the `generateMetadata` function

export { generateMetadata };

export default function ProductLayout({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
}
