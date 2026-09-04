import React, { useState } from "react";
import type { ComplianceMap } from "@/types/api";
import { LaboratoryMap } from "./LaboratoryMap";

interface ProductComplianceMapProps {
  complianceMap: ComplianceMap;
}

export function ProductComplianceMap({ complianceMap }: ProductComplianceMapProps) {
  const [activeTab, setActiveTab] = useState<"standards" | "certifications" | "testing" | "laboratories">("standards");

  const tabs = [
    { id: "standards", label: "Applicable Standards", count: complianceMap.standards.length },
    { id: "certifications", label: "Certifications", count: complianceMap.certifications.length },
    { id: "testing", label: "Testing Requirements", count: complianceMap.testing.length },
    { id: "laboratories", label: "Labs Near You", count: complianceMap.laboratories.length },
  ] as const;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="bg-[#063B73] px-6 py-4 border-b border-slate-200">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Product Compliance Map
        </h2>
        <p className="text-sm text-blue-100 mt-1">
          Complete regulatory pathway for the requested product.
        </p>
      </div>

      <div className="border-b border-slate-200 bg-slate-50/50">
        <div className="flex overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "border-[#075DA8] text-[#063B73] bg-blue-50/50"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {tab.label}
              <span
                className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  activeTab === tab.id
                    ? "bg-[#075DA8] text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 min-h-[400px]">
        {activeTab === "standards" && (
          <div className="space-y-4">
            {complianceMap.standards.length === 0 ? (
              <EmptyState message="No applicable standards mapped to this product." />
            ) : (
              complianceMap.standards.map((std, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm transition-all group">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#063B73]">{std.standardNumber}</span>
                      {std.confidence === "high" && (
                        <span className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                          High Confidence
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 mt-1 font-medium">{std.title}</p>
                  </div>
                  <button className="mt-3 sm:mt-0 px-4 py-2 text-sm font-medium text-[#075DA8] bg-blue-50 hover:bg-blue-100 rounded-md transition-colors whitespace-nowrap">
                    View Details
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "certifications" && (
          <div className="space-y-4">
            {complianceMap.certifications.length === 0 ? (
              <EmptyState message="No specific certification schemes mapped." />
            ) : (
              complianceMap.certifications.map((cert, i) => (
                <div key={i} className="p-4 rounded-lg border border-slate-200 bg-white hover:border-blue-200 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">{cert.scheme}</h3>
                      <p className="text-sm text-slate-600 mt-1">Status: <span className="font-medium text-slate-900">{cert.status}</span></p>
                    </div>
                    {cert.sourceUrl && (
                      <a href={cert.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#075DA8] hover:underline text-sm font-medium flex items-center gap-1">
                        Source
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "testing" && (
          <div className="space-y-4">
            {complianceMap.testing.length === 0 ? (
              <EmptyState message="No specific testing requirements identified." />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Test / Parameter</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reference Standard</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Clause</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {complianceMap.testing.map((test, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{test.testName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{test.standard}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{test.clause || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "laboratories" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Recognised laboratories capable of testing against the identified standards.
              </p>
              <div className="flex gap-2">
                 <select className="text-sm border border-slate-200 rounded-md px-3 py-1.5 text-slate-700 bg-white outline-none focus:border-[#075DA8]">
                   <option>All States</option>
                   <option>Delhi</option>
                   <option>Maharashtra</option>
                   <option>U.P.</option>
                 </select>
              </div>
            </div>
            <LaboratoryMap laboratories={complianceMap.laboratories} />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-slate-500 font-medium">{message}</p>
    </div>
  );
}
