import React, { useEffect, useState } from "react";

import BillToPrint from "./BillToPrint";
import { useRef } from "react";
import PrintableBill from "./PrintableBill";

const CreateBill = () => {
  const [retailers, setRetailers] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [rate, setRate] = useState(0);
  const [date, setDate] = useState("");
  const [items, setItems] = useState([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [newItem, setNewItem] = useState({ itemName: "" });
  const [totals, setTotals] = useState({ grossWeight: 0, netWeight: 0, totalSilver: 0, netLabour: 0 });
  // const [kachi, setKachi] = useState({ kachiwt: 0, kachiTunch: 0, kachiFine: 0 });
  const [kachis, setKachis] = useState([{ kachiwt: 0, kachiTunch: 0, kachiFine: 0 }]);
  const [lastBalance, setLastBalance] = useState({ fineBalance: null, cashBalance: null });
  const [closingBalance, setClosingBalance] = useState({ fineBalance: null, cashBalance: null })
  const addKachhi = () => {
    setKachis([...kachis, { kachiwt: 0, kachiTunch: 0, kachiFine: 0 }]);
  };
  const handleKachhiChange = (index, field, value) => {
    const updated = [...kachis];
    updated[index][field] = parseFloat(value) || 0;
    updated[index].kachiFine = ((updated[index].kachiwt * updated[index].kachiTunch)*0.996) / 100;
    setKachis(updated);
  };

  const [fine, setFine] = useState(0);
  const [received, setReceived] = useState(0);
  // const [billAdded, setBillAdded] = useState(true);
  const [submit, setSubmit] = useState(false);

  const componentRef = useRef();
  const [isBillReady, setIsBillReady] = useState(false);

  // const handlePrint = () => {
  //   window.print();
  // };
  const handlePrint = () => {
    const printContents = document.getElementById("print-section").innerHTML;
    const newWindow = window.open("", "", "width=800,height=600");
    newWindow.document.write(`
      <html>
        <head>
          <title>Print Bill</title>
          <style>
            /* Add any required print styles here */
            body {
              font-family: sans-serif;
              padding: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid black;
              padding: 4px;
              text-align: left;
            }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);
    newWindow.document.close();
    newWindow.focus();
    newWindow.print();
    newWindow.close();
  };


  useEffect(() => {
    fetch("http://localhost:5000/api/getretailers")
      .then((res) => res.json())
      .then((data) => setRetailers(data));

    fetch("http://localhost:5000/api/getstocks")
      .then((res) => res.json())
      .then((data) => setStocks(data));
  }, []);

  useEffect(() => {
    const net = newItem.grossWeight && newItem.poly && newItem.pcs
      ? parseFloat(newItem.grossWeight) - parseFloat(newItem.poly) * parseFloat(newItem.pcs || 0)
      : 0;
    const silver = net && newItem.sellTunch ? (net * parseFloat(newItem.sellTunch)) / 100 : 0;
    const labour = newItem.labour ? (net * parseFloat(newItem.labour) / 100) : 0;
    setNewItem({ ...newItem, netWeight: net.toFixed(3), silver: silver.toFixed(3), netLabour: labour.toFixed(2) });
  }, [newItem.grossWeight, newItem.poly, newItem.pcs, newItem.sellTunch, newItem.labour]);

  useEffect(() => {
    const totalGross = items.reduce((acc, item) => acc + parseFloat(item.grossWeight), 0);
    const totalNet = items.reduce((acc, item) => acc + parseFloat(item.netWeight), 0);
    const totalSilver = items.reduce((acc, item) => acc + parseFloat(item.silver), 0);
    const totalLabour = items.reduce((acc, item) => acc + parseFloat(item.netLabour || 0), 0);

    setTotals({ grossWeight: totalGross, netWeight: totalNet, totalSilver, netLabour: totalLabour });
  }, [items]);

  // useEffect(() => {
  //   const calcFine = (kachi.kachiwt * kachi.kachiTunch) / 100;
  //   setFine(calcFine);
  //   kachi.kachiFine = calcFine;
  // }, [kachi]);
  useEffect(() => {
    const totalFine = kachis.reduce((acc, k) => acc + ((k.kachiwt * k.kachiTunch)*0.9960) / 100, 0);
    setFine(totalFine);
  }, [kachis]);

  // const handleRetailerChange = (e) => {
  //   const selected = retailers.find((r) => r.name === e.target.value);
  //   setSelectedRetailer(selected);
  // };
  const handleRetailerChange = async (e) => {
    const selected = retailers.find((r) => r.name === e.target.value);
    setSelectedRetailer(selected);
    setLastBalance({ fineBalance: null, cashBalance: null }); // Reset balances
    setClosingBalance({ fineBalance: null, cashBalance: null }); // Reset closing balances
    if (selected) {
      try {
        const response = await fetch(`http://localhost:5000/api/getretailerbalance/${selected.retailerId}`);
        const data = await response.json();
        if (response.ok) {
          setLastBalance({
            fineBalance: data.fineBalance || 0,
            cashBalance: data.cashBalance || 0,
          });
        } else {
          console.error("Error fetching retailer balance:", data.message);
        }
      } catch (error) {
        console.error("Error fetching retailer balance:", error);
      }
    }
  };
  const handleItemNameChange = (e) => {
    const item = stocks.find((i) => i.itemName === e.target.value);
    setNewItem({
      ...item,
      sellTunch: item.sellTunch,
      poly: item.poly,
      pcs: "",
      grossWeight: "",
    });
  };

  const addItem = () => {
     if (!newItem.grossWeight || !newItem.pcs) {
    alert("Please fill all required fields!");
    return;
  }
    if (!newItem.netLabour) {
      const net = parseFloat(newItem.netWeight || 0);
      const labour = newItem.labour ? (net * parseFloat(newItem.labour) / 100) : 0;
      newItem.netLabour = labour.toFixed(2);
    }
    setItems([...items, newItem]);
    setShowOverlay(false);
    setNewItem({ itemName: "" });
  };
  const removeItem = (index) => {
    const updatedItems = [...items];
    updatedItems.splice(index, 1);
    setItems(updatedItems);
  };

  const totalFineCredit = totals.totalSilver - fine;
  const totalAmount = (totalFineCredit * rate) / 10 + (totals.netLabour || 0);
  // const remaining = totalFineCredit / (rate / 1000);
  let remaining = totalFineCredit;
  let remainingCash = totals.netLabour || 0;

  if (received > 0) {
    // Deduct labour first
    remainingCash = Math.max(0, totals.netLabour - received);
    // Remaining amount after labour is converted to silver
    const remainingAfterLabour = Math.max(0, received - totals.netLabour);
    const silverReceived = remainingAfterLabour / (rate / 100);
    remaining = totalFineCredit - silverReceived;
  }

  const [billId, setBillId] = useState(0);

  // Generate Bill ID only once when the user is about to submit
  // const generateBillId = () => {
  //   return Math.floor(100 + Math.random() * 900); // 3-digit random number
  // };

  // useEffect(() => {
  //   if (billId === null) {
  //     setBillId(generateBillId());
  //   }
  // }, [billId]);
  const handleSubmit = async (e) => {
   if (rate <= 0 || !rate) {
    alert("Please fill rate");
    return;
  }
    e.preventDefault();
    setSubmit(true);

    const bill = {
      billId: 0, // This will be set by the backend
      date,
      rate,
      items,
      totals,
      // kachi,
      kachi: kachis,
      totalFineCredit,
      totalAmount,
      received,
      remaining,
      remainingCash,
      profitRupees,
      profitSilver
    };

    try {
      const response = await fetch("http://localhost:5000/api/create-bill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          retailerId: selectedRetailer.retailerId,
          bill,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Bill added successfully! Bill ID: ${data.billId}`);
        setBillId(data.billId); // 🟢 Set the returned billId
        setClosingBalance({
          fineBalance: data.fineBalance || 0,
          cashBalance: data.cashBalance || 0,
        });
        setSubmit(false);
        // setBillAdded(false);
        setIsBillReady(true);
        console.log("Added bill:", data);
      } else {
        alert("Error: " + data.message);
        setSubmit(false);
      }
    } catch (error) {
      console.error("Error adding bill:", error);
      alert("An unexpected error occurred");
      setSubmit(false);
    }
  };
  // 🔁 Calculate Profit in Silver
  const profitSilver = items.reduce((acc, item) => {
    const netWt = parseFloat(item.netWeight || 0);
    const tunch = parseFloat(item.tunch || 0);
    const sellTunch = parseFloat(item.sellTunch || 0);
    const silverDiff = ((sellTunch - tunch) * netWt) / 100;
    return acc + silverDiff;
  }, 0);

  // 🔁 Calculate Profit in Rupees
  const profitRupees = items.reduce((acc, item) => {
    const netWt = parseFloat(item.netWeight || 0);
    const sellTunch = parseFloat(item.sellTunch || 0);
    const billingRate = parseFloat(rate); // global billing rate entered by user
    const itemRate = parseFloat(item.rate || 0); // item-wise cost rate

    const sellVal = (netWt * (sellTunch / 100) * (billingRate / 100));
    const actualVal = (netWt * (item.tunch / 100) * (itemRate / 100));

    return acc + (sellVal - actualVal);
  }, 0);
  const [searchTerm, setSearchTerm] = useState("");

  // Filtered items based on search
  const filteredStocks = stocks.filter((stock) =>
    stock.itemName.toLowerCase().includes(searchTerm.toLowerCase())
  );




  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Create Bill</h2>
      <div className="space-x-4">
        <select onChange={handleRetailerChange} className="border p-2">
          <option>Select Retailer</option>
          {retailers.map((r) => (
            <option key={r.retailerId}>{r.name}</option>
          ))}
        </select>
        <input type="text" value={selectedRetailer?.phone || ""} disabled className="border p-2" required />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border p-2" required />
        <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Rate" className="border p-2" required />
      </div>

      <button onClick={() => setShowOverlay(true)} className="btn btn-warning m-3 text-white px-4 py-2">Add Item</button>

      {showOverlay && (
        <div className="d- ">
          <h3 className="font-bold">Add Item</h3>

          <div className="d-flex flex-column mb-5">
            <div className="d-flex flex-column mb-5">
              <input
                type="text"
                list="stockOptions"
                placeholder="Search or select item..."
                value={newItem.itemName}
                onChange={(e) => {
                  setNewItem({ ...newItem, itemName: e.target.value });
                  const item = stocks.find((i) => i.itemName === e.target.value);
                  if (item) {
                    setNewItem({
                      ...item,
                      sellTunch: item.sellTunch,
                      poly: item.poly,
                      pcs: "",
                      grossWeight: "",
                    });
                  }
                }}
                className="border p-2 mb-2"
              />

              {/* Datalist acts like dropdown + search */}
              <datalist id="stockOptions">
                {stocks.map((stock) => (
                  <option key={stock._id} value={stock.itemName} />
                ))}
              </datalist>
            </div>

            {/* <input
              type="text"
              placeholder="Search Item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border p-2 mb-2"
            />

            <select onChange={handleItemNameChange} className="border p-2 w-full">
              <option>Select Item</option>
              {filteredStocks.map((stock) => (
                <option key={stock._id}>{stock.itemName}</option>
              ))}
            </select> */}

            <div className="d-flex flex-wrap p-1">
              <div className="m-1">
                <label>Vendor</label>
                <input type="text" value={newItem.vendor || ""} disabled className="border p-2" required />
              </div>
              <div className="m-1">
                <label>Date</label>
                <input type="text" value={newItem.date || ""} disabled className="border p-2" required />
              </div>
              <div className="m-1">
                <label>Rate</label>
                <input type="text" value={newItem.rate || ""} disabled className="border p-2" required />
              </div>
              <div className="m-1">
                <label>Actual Tunch</label>
                <input type="text" value={newItem.actualTunch} disabled className="border p-2" required />
              </div>
              <div className="m-1">
                <label>Tunch</label>
                <input type="text" value={newItem.tunch || ""} disabled className="border p-2" required />
              </div>
              <div className="m-1">
                <label>Sell Tunch</label>
                <input type="number" value={newItem.sellTunch} onChange={(e) => setNewItem({ ...newItem, sellTunch: e.target.value })} className="border p-2" required />
              </div>
              <div className="m-1">
                <label>Poly</label>
                <input type="number" value={newItem.poly} onChange={(e) => setNewItem({ ...newItem, poly: e.target.value })} className="border p-2" required />
              </div>
              <div className="m-1">
                <label>Labour</label>
                <input
                  type="number"
                  value={newItem.labour || ""}
                  onChange={(e) => setNewItem({ ...newItem, labour: e.target.value })}
                  className="border p-2"
                  required
                />
              </div>
              <div className="m-1">
                <label>Gross Weight</label>
                <input type="number" value={newItem.grossWeight} onChange={(e) => setNewItem({ ...newItem, grossWeight: e.target.value })} placeholder="Gross Wt" className="border p-2" required />
              </div>
              <div className="m-1">
                <label>Pcs</label>
                <input type="number" value={newItem.pcs} onChange={(e) => setNewItem({ ...newItem, pcs: e.target.value })} required placeholder="Pcs" className="border p-2" />
              </div>
              <div className="m-1">
                <label>Net Weight</label>
                <input type="text" value={newItem.netWeight} disabled className="border p-2" required />
              </div>
              <div className="m-1">
                <label>GoldFine</label>
                <input type="text" value={newItem.silver} disabled className="border p-2" required />
              </div>
            </div>

            <div className="w-100 d-flex justify-content-center aling-items-center">
              <button onClick={addItem} className="btn btn-info text-white px-4 py-2 mt-2 w-25">Add</button>

            </div>
          </div>
        </div>
      )}


      {/* <div className="border min-h-[300px] overflow-y-auto p-2">
        <div className="grid grid-cols-8 gap-2 font-semibold border-b pb-2">
          <div>Item</div>
          <div>G Wt (g)</div>
          <div>Net Wt</div>
          <div>Poly</div>
          <div>Actual Tunch</div>
          <div>Sell Tunch</div>
          <div>Silver</div>
          <div>Pcs</div>
        </div>
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-8 gap-2 text-sm border-b py-1">
            <div>{item.itemName}</div>
            <div>{item.grossWeight}</div>
            <div>{item.netWeight}</div>
            <div>{item.poly}</div>
            <div>{item.actualTunch}</div>
            <div>{item.sellTunch}</div>
            <div>{item.silver}</div>
            <div>{item.pcs}</div>
          </div>
        ))}
      </div> */}
      <div className="itemdiv w-100 d-flex justify-content-center align-items-center bg-light">
        <table className="border w-100">
          <thead className="border-b font-semibold">
            <tr>
              <th className="p-2">Item</th>
              <th className="p-2">G Wt (g)</th>
              <th className="p-2">Net Wt</th>
              <th className="p-2">Poly</th>
              <th className="p-2">Actual Tunch</th>
              <th className="p-2">Sell Tunch</th>
              <th className="p-2">Gold</th>
              <th className="p-2">Pcs</th>

              <th>Labour</th>
              <th className="p-2">Action</th>

            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item, i) => (
              <tr key={i} className="border-b">
                <td className="p-2">{item.itemName}</td>
                <td className="p-2">{item.grossWeight}</td>
                <td className="p-2">{item.netWeight}</td>
                <td className="p-2">{item.poly}</td>
                <td className="p-2">{item.actualTunch}</td>
                <td className="p-2">{item.sellTunch}</td>
                <td className="p-2">{item.silver}</td>
                <td className="p-2">{item.pcs}</td>
                <td className="p-2">{`${item.labour}/hg`}</td>
                <td className="border p-2">
                  <button
                    className="btn btn-danger px-2 py-1 rounded"
                    onClick={() => removeItem(i)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
      <div className="totaldiv bg-light d-flex justify-content-between mt-3 mb-3 p-2">
        <div>Total Gross: {totals.grossWeight}</div>
        <div>Total Net: {totals.netWeight.toFixed(3)}</div>
        <div>Total Gold: {totals.totalSilver.toFixed(3)}</div>
        <div>Total labour: ₹{totals.netLabour.toFixed(2)}</div>
      </div>
      <div>
        <h3 className="font-bold mt-4">Kachhi Details</h3>
        {kachis.map((k, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="number"
              placeholder="Weight"
              value={k.kachiwt}
              onChange={(e) => handleKachhiChange(index, 'kachiwt', e.target.value)}
              className="border p-2"
            />
            <input
              type="number"
              placeholder="Tunch"
              value={k.kachiTunch}
              onChange={(e) => handleKachhiChange(index, 'kachiTunch', e.target.value)}
              className="border p-2"
            />
            <input
              type="number"
              value={k.kachiFine.toFixed(3)}
              disabled
              className="border p-2"
              placeholder="Fine"
            />
          </div>
        ))}
        <button onClick={addKachhi} className="btn btn-outline btn-sm text-blue-600">+ Add Kachhi</button>
      </div>

      {/* <div className="kacchidiv bg-light d-flex justify-content-between">
        <div classname="d-flex flex-column bg-dark">
          <label>Kacchi Wt</label>
          <input type="number" placeholder="Kachi Wt" onChange={(e) => setKachi({ ...kachi, kachiwt: e.target.value })} className="border p-2" />
        </div>
        <div classname="d-flex flex-column bg-dark">
          <label>Kacchi Tunch</label>
          <input type="number" placeholder="Fine Tunch" onChange={(e) => setKachi({ ...kachi, kachiTunch: e.target.value })} className="border p-2" />
        </div>
        <div classname="d-flex flex-column bg-dark">
          <label>Kacchi Fine</label>
          <input type="number" placeholder="Fine" value={kachi.kachiFine} disabled className="border p-2" />
        </div>
      </div> */}
      <div className="valuediv bg-light d-flex justify-content-between mt-3 p-2">
        <div className="border mx-2 p-2">Total Fine Credit: {totalFineCredit.toFixed(3)}</div>
        <div className="border mx-2 p-2">Total Amount: ₹{totalAmount.toFixed(2)}</div>
        <div>
          <label>Received </label>
          <input type="number" placeholder="Received" onChange={(e) => setReceived(e.target.value)} className="border p-2" required />
        </div>
        <input type="text" value={`Remaining Fine: ${remaining.toFixed(3)}`} disabled className="border p-2" required />
      </div>
      <div className="lastBalanceDiv bg-light d-flex justify-content-between mt-3 p-2">
        <div className="border mx-2 p-2">
          Fine Balance: {lastBalance.fineBalance !== null ? lastBalance.fineBalance.toFixed(3) : 'N/A'}
        </div>
        <div className="border mx-2 p-2">
          Cash Balance: ₹{lastBalance.cashBalance !== null ? lastBalance.cashBalance.toFixed(2) : 'N/A'}
        </div>
      </div>

      <div className="closingBalanceDiv bg-light d-flex justify-content-between mt-3 p-2">
        <div className="border mx-2 p-2">
          Updated Fine Balance: {closingBalance.fineBalance !== null ? closingBalance.fineBalance.toFixed(3) : 'N/A'}
        </div>
        <div className="border mx-2 p-2">
          Updated Cash Balance: ₹{closingBalance.cashBalance !== null ? closingBalance.cashBalance.toFixed(2) : 'N/A'}
        </div>
      </div>

      <button onClick={handleSubmit} className="btn btn-primary text-white px-4 py-2 mt-4" disabled={submit}>Submit</button>
      <div className="w-100 d-flex">
        <p className="text-muted">
          Sil {profitSilver.toFixed(3)} gm
        </p>
        <p className="text-muted">
          Rup {profitRupees.toFixed(2)}
        </p>
      </div>

      {/* {!billAdded &&       <PrintBillButton selectedRetailer={selectedRetailer} billId={billId} date={date} rate={rate} items={items} totals={totals} kachi={kachi} totalFineCredit={totalFineCredit} totalAmount={totalAmount} received={received} remaining={remaining}/>
 } */}
      {/* <button className="btn btn-danger" onClick={() => window.print()} disabled={billAdded}>Print</button> */}
      {/* <ReactToPrint
        trigger={() => <button className="btn btn-success text-white">Print</button>}
        content={() => componentRef.current}
      /> */}
      <div style={{ display: "none" }}>
        <BillToPrint
          ref={componentRef}
          selectedRetailer={selectedRetailer}
          date={date}
          rate={rate}
          items={items}
          totals={totals}
          kachi={kachis}
          totalFineCredit={totalFineCredit}
          totalAmount={totalAmount}
          received={received}
          remaining={remaining}
          closingFine={closingBalance.fineBalance}
          closingCash={closingBalance.cashBalance}
          lastFine={lastBalance.fineBalance}
          lastCash={lastBalance.cashBalance}
        />
      </div>
      {isBillReady && (
        <div>
          {/* This will only show when bill is ready */}
          <div id="print-section" className="printable">
            <PrintableBill
              selectedRetailer={selectedRetailer}
              billId={billId}
              date={date}
              rate={rate}
              items={items}
              totals={totals}
              kachi={kachis} // assuming it's a single object
              totalFineCredit={totalFineCredit}
              totalAmount={totalAmount}
              received={received}
              remaining={remaining}
              closingFine={closingBalance.fineBalance}
              closingCash={closingBalance.cashBalance}
              lastFine={lastBalance.fineBalance}
              lastCash={lastBalance.cashBalance}

            />
          </div>
          <button onClick={handlePrint} className="btn btn-success mt-4">
            Print Bill
          </button>
        </div>
      )}

    </div>
  );
};

export default CreateBill;