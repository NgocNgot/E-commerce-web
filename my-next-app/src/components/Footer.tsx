export default function Footer() {
  return (
    <footer className="bg-gray-100 text-gray-800 text-center py-6 mt-2">
      <p className="text-sm">&copy; {new Date().getFullYear()} Liceria. All rights reserved.</p>
      <div className="mt-2">
        <a href="#" className="text-blue-400 hover:underline mx-2">Privacy Policy</a>
        <a href="#" className="text-blue-400 hover:underline mx-2">Terms of Service</a>
      </div>
    </footer>
  );
};
