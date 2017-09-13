let to = require('../main.js')(module.exports)

to`
$(def defmacro (macro [name params ...body]
  ;; eval so that macros are available at expansion-time
  %(eval
    (def <name>
      (macro <params> <...body>)))))

(defmacro defn [name params ...body]
  %(def <name>
    (func <params> <...body>)))
`
