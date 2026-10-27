/**
 * Round flag for a currency, or a neutral symbol badge when the currency has no single
 * representative flag (e.g. XAF or XCD, which are shared by several countries).
 */
export default function CurrencyFlag({ currency, code, size = 28 }) {
  const style = { width: size, height: size, fontSize: size * 0.42 };
  if (currency?.flag) {
    return <span className={`flag fi fis fi-${currency.flag}`} style={style} aria-hidden="true" />;
  }
  const label = currency?.symbol && currency.symbol.length <= 3 ? currency.symbol : (code ?? currency?.code ?? '?').slice(0, 2);
  return (
    <span className="flag flag--badge" style={style} aria-hidden="true">
      {label}
    </span>
  );
}
