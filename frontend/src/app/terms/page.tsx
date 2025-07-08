export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">利用規約</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第1条（適用）</h2>
            <p className="text-gray-700 leading-relaxed">
              本規約は、ナンバーズ4予想システム（以下「本サービス」といいます。）の利用条件を定めるものです。
              登録ユーザーの皆さま（以下「ユーザー」といいます。）には、本規約に従って、本サービスをご利用いただきます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第2条（利用登録）</h2>
            <p className="text-gray-700 leading-relaxed">
              1. 利用登録の申請は、本規約に同意の上、当社の定める方法によって行うものとします。<br />
              2. 当社は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあります。<br />
              ・利用登録の申請に際して虚偽の事項を届け出た場合<br />
              ・本規約に違反したことがある者からの申請である場合<br />
              ・その他、当社が利用登録を相当でないと判断した場合
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第3条（サービス内容）</h2>
            <p className="text-gray-700 leading-relaxed">
              本サービスは、ナンバーズ4の予想番号を提供するものです。予想結果はあくまで参考情報であり、
              当選を保証するものではありません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第4条（料金および支払方法）</h2>
            <p className="text-gray-700 leading-relaxed">
              1. ユーザーは、本サービスの有料部分の対価として、当社が別途定め、本ウェブサイトに表示する料金を支払うものとします。<br />
              2. 料金の支払方法は、クレジットカード決済とします。<br />
              3. ユーザーが料金の支払を遅滞した場合、年14.6％の割合による遅延損害金を支払うものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第5条（禁止事項）</h2>
            <p className="text-gray-700 leading-relaxed">
              ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。<br />
              1. 法令または公序良俗に違反する行為<br />
              2. 犯罪行為に関連する行為<br />
              3. 当社のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為<br />
              4. 当社のサービスの運営を妨害するおそれのある行為<br />
              5. 他のユーザーに関する個人情報等を収集または蓄積する行為<br />
              6. 他のユーザーに成りすます行為<br />
              7. 当社のサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為<br />
              8. その他、当社が不適切と判断する行為
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第6条（免責事項）</h2>
            <p className="text-gray-700 leading-relaxed">
              1. 当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、
              セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。<br />
              2. 当社は、本サービスによってユーザーに生じたあらゆる損害について、一切の責任を負いません。<br />
              3. 前項の定めにかかわらず、当社の故意または重過失により本サービスに関してユーザーに生じた損害については、この限りではありません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第7条（サービス内容の変更等）</h2>
            <p className="text-gray-700 leading-relaxed">
              当社は、ユーザーへの事前の告知をもって、本サービスの内容を変更、追加または廃止することがあり、
              ユーザーはこれを承諾するものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第8条（利用規約の変更）</h2>
            <p className="text-gray-700 leading-relaxed">
              当社は、ユーザーに通知することなく、いつでも本規約を変更することができるものとします。
              変更後の本規約は、当社ウェブサイトに掲示された時点から効力を生じるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第9条（準拠法・裁判管轄）</h2>
            <p className="text-gray-700 leading-relaxed">
              1. 本規約の解釈にあたっては、日本法を準拠法とします。<br />
              2. 本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
            </p>
          </section>

          <div className="pt-6 text-sm text-gray-600">
            <p>制定日：2024年1月1日</p>
          </div>
        </div>
      </div>
    </div>
  );
}