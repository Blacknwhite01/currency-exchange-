import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useAppData } from '../context/AppData.jsx';
import CurrencyFlag from './CurrencyFlag.jsx';
import Icon from './Icon.jsx';

function score(currency, q) {
  const code = currency.code.toLowerCase();
  const name = currency.name.toLowerCase();
  if (code === q) return 0;
  if (code.startsWith(q)) return 1;
  if (name.startsWith(q) || name.includes(` ${q}`)) return 2;
  if (name.includes(q) || code.includes(q)) return 3;
  if (currency.symbol && currency.symbol.toLowerCase() === q) return 4;
  return -1;
}

/**
 * Searchable currency picker. Keyboard: Enter/Space/↓ opens; type to filter; ↑/↓ move;
 * Enter selects; Escape closes. Only currencies supported by the backend can be chosen.
 */
export default function CurrencySelect({ label, value, onChange, disabledCodes = [], variant = 'field', hideLabel = false }) {
  const { currencies, byCode } = useAppData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const id = useId();
  const labelId = `${id}-label`;
  const listId = `${id}-list`;

  const groups = useMemo(() => {
    const all = currencies.data ?? [];
    const q = query.trim().toLowerCase();
    if (q) {
      const matches = all
        .map((c) => ({ c, s: score(c, q) }))
        .filter((m) => m.s >= 0)
        .sort((a, b) => a.s - b.s)
        .map((m) => m.c);
      return [{ title: `${matches.length} result${matches.length === 1 ? '' : 's'}`, items: matches }];
    }
    return [
      { title: 'Popular', items: all.filter((c) => c.popular) },
      { title: 'All currencies', items: all.filter((c) => !c.popular) },
    ];
  }, [currencies.data, query]);

  const options = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector(`[data-index="${active}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const openList = () => {
    setQuery('');
    const index = options.findIndex((c) => c.code === value);
    setActive(index >= 0 ? index : 0);
    setOpen(true);
  };

  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const choose = (currency) => {
    if (!currency || disabledCodes.includes(currency.code)) return;
    onChange(currency.code);
    close();
  };

  const onInputKey = (event) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActive((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case 'PageDown':
        event.preventDefault();
        setActive((i) => Math.min(i + 8, options.length - 1));
        break;
      case 'PageUp':
        event.preventDefault();
        setActive((i) => Math.max(i - 8, 0));
        break;
      case 'Enter':
        event.preventDefault();
        choose(options[active]);
        break;
      case 'Escape':
        event.preventDefault();
        close();
        break;
      case 'Tab':
        close(false);
        break;
      default:
    }
  };

  const onTriggerKey = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openList();
    }
  };

  const selected = byCode.get(value);
  const loading = currencies.loading && !currencies.data;

  let index = -1;
  return (
    <div className={`cselect cselect--${variant} ${open ? 'is-open' : ''}`} ref={rootRef}>
      {label && (
        <span id={labelId} className={`field-label ${hideLabel ? 'sr-only' : ''}`}>
          {label}
        </span>
      )}
      <button
        ref={triggerRef}
        type="button"
        className="cselect__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${labelId} ${id}-value` : undefined}
        disabled={loading || !!currencies.error}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onTriggerKey}
      >
        {variant === 'add' ? (
          <span id={`${id}-value`} className="cselect__add">
            <Icon name="plus" size={16} /> Add currency
          </span>
        ) : (
          <>
            <CurrencyFlag currency={selected} code={value} size={30} />
            <span id={`${id}-value`} className="cselect__value">
              <span className="cselect__code">{value || 'Select'}</span>
              <span className="cselect__name">{loading ? 'Loading…' : selected?.name ?? (value ? 'Unavailable' : '')}</span>
            </span>
            <Icon name="chevron" size={18} className="cselect__chevron" />
          </>
        )}
      </button>

      {open && (
        <div className="cselect__popover" role="dialog" aria-label={label ? `Choose ${label.toLowerCase()}` : 'Choose currency'}>
          <div className="cselect__search">
            <Icon name="search" size={18} />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={options[active] ? `${id}-opt-${options[active].code}` : undefined}
              aria-label="Search currencies by code or name"
              placeholder="Search code or name"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onInputKey}
              autoComplete="off"
              spellCheck="false"
            />
          </div>
          <ul className="cselect__list" role="listbox" id={listId} ref={listRef} aria-label="Currencies">
            {options.length === 0 && (
              <li className="cselect__empty" role="presentation">
                No currency matches “{query}”. Try a code like <strong>EUR</strong> or a name like <strong>yen</strong>.
              </li>
            )}
            {groups.map((group) =>
              group.items.length === 0 ? null : (
                <li key={group.title} role="presentation">
                  <p className="cselect__group">{group.title}</p>
                  <ul role="presentation">
                    {group.items.map((currency) => {
                      index += 1;
                      const i = index;
                      const disabled = disabledCodes.includes(currency.code);
                      return (
                        <li
                          key={currency.code}
                          id={`${id}-opt-${currency.code}`}
                          data-index={i}
                          role="option"
                          aria-selected={currency.code === value}
                          aria-disabled={disabled || undefined}
                          className={`cselect__option ${i === active ? 'is-active' : ''} ${disabled ? 'is-disabled' : ''}`}
                          onMouseEnter={() => setActive(i)}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => choose(currency)}
                        >
                          <CurrencyFlag currency={currency} size={26} />
                          <span className="cselect__option-code">{currency.code}</span>
                          <span className="cselect__option-name">{currency.name}</span>
                          <span className="cselect__option-symbol">{currency.symbol !== currency.code ? currency.symbol : ''}</span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
