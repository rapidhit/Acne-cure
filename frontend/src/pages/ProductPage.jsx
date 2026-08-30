import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api, getOrCreateSessionId } from "../lib/api.js";
import TemplateProduct from "./TemplateProduct.jsx";
import CustomCodeProduct from "./CustomCodeProduct.jsx";

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(false);
  const sessionId = useMemo(() => getOrCreateSessionId(), []);

  useEffect(() => {
    setProduct(null);
    setError(false);
    const fetchProduct = slug ? api.getProductBySlug(slug) : api.getDefaultProduct();
    fetchProduct.then(setProduct).catch(() => setError(true));
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    api.trackVisit(sessionId, slug ? `/${slug}` : "/", document.referrer, product.slug);
  }, [product, sessionId, slug]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fffef9] text-[#0f3d1f] px-6">
        <div className="text-center">
          <div className="text-[48px]">🔍</div>
          <h1 className="mt-2 text-[20px] font-black">Page not found</h1>
          <p className="mt-2 text-[14px] text-[#0f3d1f]/60">This product doesn't exist or isn't available.</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fffef9]">
        <div className="w-10 h-10 rounded-full border-4 border-[#a3d65c] border-t-transparent animate-spin" />
      </div>
    );
  }

  return product.mode === "custom_code" ? (
    <CustomCodeProduct product={product} />
  ) : (
    <TemplateProduct product={product} />
  );
}
