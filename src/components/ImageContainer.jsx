export default function ImageContainer({ children }) {
  return (
    <div
      style={{
        flex: 1,
        background: "#121214",
        border: "1px solid #232326",
        borderRadius: 16,
        padding: 16,
        minHeight: 300,
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}
